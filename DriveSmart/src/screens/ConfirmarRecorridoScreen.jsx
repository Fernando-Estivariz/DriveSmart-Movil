"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
    Modal,
} from "react-native"
import MapView, { Marker } from "react-native-maps"
import Geolocation from "@react-native-community/geolocation"
import MapViewDirections from "react-native-maps-directions"
import { useRoute, useNavigation } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialIcons"
import Config from "react-native-config"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const ConfirmarRecorridoScreen = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { destinationLocation } = route.params || {}

    const [origin, setOrigin] = useState(null)
    const [region, setRegion] = useState(null)
    const [distance, setDistance] = useState(null)
    const [duration, setDuration] = useState(null)
    const [routeDetails, setRouteDetails] = useState([])
    const [routeCoordinates, setRouteCoordinates] = useState([])
    const [loadingRoute, setLoadingRoute] = useState(true)
    const [originAddress, setOriginAddress] = useState("Obteniendo ubicación...")
    const [destinationAddress, setDestinationAddress] = useState("Cargando destino...")
    const [isStartingTrip, setIsStartingTrip] = useState(false)

    const [error, setError] = useState(null)
    const [errorType, setErrorType] = useState(null)
    const retryCountRef = useRef(0)
    const maxRetries = 2

    // Estados para validación de placas
    const [userProfile, setUserProfile] = useState(null)
    const [restrictionPolygons, setRestrictionPolygons] = useState([])
    const [showRestrictionAlert, setShowRestrictionAlert] = useState(false)
    const [restrictionAlertData, setRestrictionAlertData] = useState(null)
    const [confirmedDespiteRestriction, setConfirmedDespiteRestriction] = useState(false)

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(100)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current

    // Animaciones para el modal de restricción
    const pulseAnim = useRef(new Animated.Value(1)).current
    const slideAlertAnim = useRef(new Animated.Value(-300)).current
    const fadeAlertAnim = useRef(new Animated.Value(0)).current

    const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            })
            clearTimeout(timeoutId)
            return response
        } catch (error) {
            clearTimeout(timeoutId)
            if (error.name === "AbortError") {
                throw new Error("TIMEOUT")
            }
            throw error
        }
    }

    const categorizeError = (error, context) => {
        console.log(`[v0] Error en ${context}:`, error)

        if (error.message === "TIMEOUT") {
            return {
                type: "warning",
                message: "La conexión está tardando más de lo normal",
                canRetry: true,
            }
        }

        if (!error.response && (error.message.includes("Network") || error.message.includes("Failed to fetch"))) {
            return {
                type: "error",
                message: "Sin conexión a Internet. Verifica tu red",
                canRetry: true,
            }
        }

        if (error.response?.status === 401) {
            return {
                type: "error",
                message: "Sesión expirada",
                canRetry: false,
            }
        }

        if (error.response?.status === 429) {
            return {
                type: "warning",
                message: "Demasiadas solicitudes. Intenta en unos momentos",
                canRetry: true,
            }
        }

        if (error.response?.status >= 500) {
            return {
                type: "error",
                message: "Error en el servidor. Intenta nuevamente",
                canRetry: true,
            }
        }

        return {
            type: "error",
            message: error.response?.data?.message || "Error al procesar la solicitud",
            canRetry: true,
        }
    }

    const showError = (message, type = "error") => {
        setError(message)
        setErrorType(type)

        // Auto-ocultar errores de tipo info después de 5 segundos
        if (type === "info") {
            setTimeout(() => {
                setError(null)
                setErrorType(null)
            }, 5000)
        }
    }

    const getAddressFromCoordinates = async (latitude, longitude, retryCount = 0) => {
        try {
            if (!latitude || !longitude) {
                return "Coordenadas no válidas"
            }

            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${Config.GOOGLE_MAPS_APIKEY}&language=es`

            const response = await fetchWithTimeout(url, {}, 10000)
            const data = await response.json()

            if (data.results && data.results.length > 0) {
                const result = data.results[0]
                const addressComponents = result.address_components || []

                let streetNumber = ""
                let route = ""
                let locality = ""

                addressComponents.forEach((component) => {
                    if (component.types && component.types.includes("street_number")) {
                        streetNumber = component.long_name || ""
                    }
                    if (component.types && component.types.includes("route")) {
                        route = component.long_name || ""
                    }
                    if (component.types && component.types.includes("locality")) {
                        locality = component.long_name || ""
                    }
                })

                let address = ""
                if (route) {
                    address = route
                    if (streetNumber) {
                        address += ` ${streetNumber}`
                    }
                    if (locality) {
                        address += `, ${locality}`
                    }
                } else {
                    address = result.formatted_address || "Dirección no disponible"
                }

                return address
            } else {
                return "Dirección no disponible"
            }
        } catch (error) {
            console.error("[v0] Error getting address:", error)

            // Reintentar solo para errores de red y si no hemos superado el máximo
            if (retryCount < maxRetries && (error.message === "TIMEOUT" || error.message.includes("Network"))) {
                console.log(`[v0] Reintentando obtener dirección (${retryCount + 1}/${maxRetries})...`)
                await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)))
                return getAddressFromCoordinates(latitude, longitude, retryCount + 1)
            }

            const errorInfo = categorizeError(error, "getAddressFromCoordinates")
            showError(errorInfo.message, errorInfo.type)
            return "Error al obtener dirección"
        }
    }

    const iniciarViajeEnBD = async (origenCoords, destinoCoords, trayectoriaCoords, distanciaEstimada) => {
        try {
            const token = await AsyncStorage.getItem("authToken")

            if (!token) {
                showError("No se encontró token de autenticación", "error")
                return null
            }

            const response = await axios.post(
                `${Config.API_URL}/viajes/iniciar`,
                {
                    origen_lat: origenCoords.latitude,
                    origen_lng: origenCoords.longitude,
                    destino_lat: destinoCoords.latitude,
                    destino_lng: destinoCoords.longitude,
                    trayectoria_coords: trayectoriaCoords,
                    distancia_estimada: distanciaEstimada,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                },
            )

            if (response.data.success) {
                return response.data.viaje_id
            } else {
                throw new Error(response.data.message || "Error iniciando viaje")
            }
        } catch (error) {
            console.error("[v0] Error iniciando viaje en BD:", error)

            const errorInfo = categorizeError(error, "iniciarViajeEnBD")

            if (error.response?.status === 401) {
                Alert.alert("Sesión expirada", "Por favor, inicia sesión nuevamente", [
                    { text: "OK", onPress: () => navigation.navigate("LoginScreen") },
                ])
                return null
            }

            showError(errorInfo.message, errorInfo.type)
            return null
        }
    }

    const handleRetryAddress = async () => {
        setError(null)
        setErrorType(null)
        retryCountRef.current = 0

        if (origin) {
            setOriginAddress("Obteniendo ubicación...")
            const originAddr = await getAddressFromCoordinates(origin.latitude, origin.longitude)
            setOriginAddress(originAddr || "Ubicación actual")
        }

        if (destinationLocation?.latitude && destinationLocation?.longitude) {
            setDestinationAddress("Cargando destino...")
            const destAddr = await getAddressFromCoordinates(destinationLocation.latitude, destinationLocation.longitude)
            setDestinationAddress(destAddr || "Destino")
        }
    }

    const getCurrentDayRestriction = () => {
        const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
        const restrictions = {
            1: { numbers: ["0", "1"], day: "Lunes" },
            2: { numbers: ["2", "3"], day: "Martes" },
            3: { numbers: ["4", "5"], day: "Miércoles" },
            4: { numbers: ["6", "7"], day: "Jueves" },
            5: { numbers: ["8", "9"], day: "Viernes" },
        }
        return restrictions[today] || null
    }

    const isPlateRestrictedToday = (placa) => {
        const currentRestriction = getCurrentDayRestriction()
        if (!currentRestriction || !placa) return false
        const lastDigit = placa.slice(-1)
        return currentRestriction.numbers.includes(lastDigit)
    }

    const isPointInPolygon = (point, polygon) => {
        const { latitude: x, longitude: y } = point
        let inside = false

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].latitude
            const yi = polygon[i].longitude
            const xj = polygon[j].latitude
            const yj = polygon[j].longitude

            if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
                inside = !inside
            }
        }

        return inside
    }

    const fetchUserProfile = async () => {
        try {
            const token = await AsyncStorage.getItem("authToken")
            if (!token) {
                console.log("[v0] No hay token de usuario")
                return
            }

            const response = await axios.get(`${Config.API_URL}/get-profile`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            })

            setUserProfile(response.data)
            console.log("[v0] Perfil de usuario obtenido:", response.data)
        } catch (error) {
            console.error("[v0] Error al obtener el perfil del usuario:", error)
        }
    }

    const fetchRestrictionPolygons = async () => {
        try {
            console.log("[v0] Obteniendo polígonos de restricción...")
            const response = await axios.get(`${Config.API_URL}/mapeado`, {
                headers: {
                    "Content-Type": "application/json",
                },
            })

            const polygons = response.data.filter((mapeado) => mapeado.type === "polygon")
            setRestrictionPolygons(polygons)
            console.log("[v0] Polígonos de restricción obtenidos:", polygons.length)
        } catch (error) {
            console.error("[v0] Error al obtener polígonos de restricción:", error)
        }
    }

    const checkDestinationRestriction = () => {
        if (!destinationLocation || !userProfile || !restrictionPolygons.length) {
            return false
        }

        const destinationCoords = {
            latitude: destinationLocation.latitude,
            longitude: destinationLocation.longitude,
        }

        for (const polygon of restrictionPolygons) {
            const polygonCoords = polygon.latlngs.map((coord) => ({
                latitude: coord[0],
                longitude: coord[1],
            }))

            if (isPointInPolygon(destinationCoords, polygonCoords)) {
                console.log("[v0] Destino está dentro del área de restricción")

                if (isPlateRestrictedToday(userProfile.placa)) {
                    const currentRestriction = getCurrentDayRestriction()
                    return {
                        isRestricted: true,
                        restriction: currentRestriction,
                        userPlate: userProfile.placa,
                    }
                }
            }
        }

        return false
    }

    const getCurrentTime = () => {
        const now = new Date()
        const hour = now.getHours()
        if (hour >= 7 && hour < 19) {
            return "EN HORARIO DE RESTRICCIÓN"
        }
        return "FUERA DE HORARIO DE RESTRICCIÓN"
    }

    const startRestrictionAlertAnimations = () => {
        Animated.parallel([
            Animated.timing(slideAlertAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAlertAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start()

        const pulse = () => {
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]).start(() => pulse())
        }
        pulse()
    }

    const closeRestrictionAlert = () => {
        Animated.parallel([
            Animated.timing(slideAlertAnim, {
                toValue: -300,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAlertAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowRestrictionAlert(false)
            setRestrictionAlertData(null)
        })
    }

    const handleContinueDespiteRestriction = () => {
        setConfirmedDespiteRestriction(true)
        closeRestrictionAlert()
        // Llamar a handleStart después de cerrar el modal
        setTimeout(() => {
            handleStart()
        }, 500)
    }

    useEffect(() => {
        if (!destinationLocation) {
            Alert.alert("Error", "No se recibió información del destino")
            navigation.goBack()
            return
        }

        // Obtener perfil del usuario y polígonos de restricción
        fetchUserProfile()
        fetchRestrictionPolygons()

        // Obtener la ubicación actual del usuario
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                const originCoords = { latitude, longitude }

                setOrigin(originCoords)
                setRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                })

                // Obtener dirección del origen
                try {
                    const originAddr = await getAddressFromCoordinates(latitude, longitude)
                    setOriginAddress(originAddr || "Ubicación actual")
                } catch (error) {
                    setOriginAddress("Error al obtener ubicación")
                }

                // Animaciones de entrada
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideUpAnim, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.spring(logoScale, {
                        toValue: 1,
                        tension: 50,
                        friction: 7,
                        useNativeDriver: true,
                    }),
                ]).start()
            },
            (error) => {
                console.log("[v0] Error obteniendo ubicación:", error)
                setOriginAddress("Error al obtener ubicación")
                setLoadingRoute(false)
                showError("No se pudo obtener tu ubicación actual", "error")
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
        )

        // Obtener dirección del destino si ya viene con address, sino calcularla
        const getDestinationAddress = async () => {
            try {
                if (destinationLocation?.address) {
                    setDestinationAddress(destinationLocation.address)
                } else if (destinationLocation?.latitude && destinationLocation?.longitude) {
                    const destAddr = await getAddressFromCoordinates(destinationLocation.latitude, destinationLocation.longitude)
                    setDestinationAddress(destAddr || "Destino")
                } else {
                    setDestinationAddress("Destino no válido")
                }
            } catch (error) {
                setDestinationAddress("Error al obtener destino")
            }
        }

        getDestinationAddress()
    }, [destinationLocation, navigation])

    const animateButton = (callback) => {
        Animated.sequence([
            Animated.timing(buttonScale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(buttonScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start()
        if (callback) callback()
    }

    const handleCancel = () => {
        animateButton(() => navigation.goBack())
    }

    const handleMenu = () => {
        navigation.navigate("MenuScreen")
    }

    const handleStart = async () => {
        if (loadingRoute) {
            Alert.alert("Calculando ruta", "Por favor, espere a que se calcule la ruta.")
            return
        }

        if (!origin || !destinationLocation) {
            Alert.alert("Error", "Faltan datos de ubicación.")
            return
        }

        // Verificar restricciones solo si no se ha confirmado a pesar de la restricción
        if (!confirmedDespiteRestriction) {
            const restrictionCheck = checkDestinationRestriction()

            if (restrictionCheck && restrictionCheck.isRestricted) {
                // Mostrar modal de advertencia
                setRestrictionAlertData({
                    title: "⚠️ ZONA RESTRINGIDA",
                    message: `Tu vehículo con placa terminada en "${restrictionCheck.userPlate.slice(
                        -1,
                    )}" no puede circular hoy ${restrictionCheck.restriction.day} en esta zona.`,
                    restriction: restrictionCheck.restriction,
                    userPlate: restrictionCheck.userPlate,
                })
                setShowRestrictionAlert(true)
                startRestrictionAlertAnimations()
                return // No continuar hasta que el usuario confirme
            }
        }

        // Continuar con el inicio del viaje
        setIsStartingTrip(true)
        setError(null)
        setErrorType(null)

        try {
            const viajeId = await iniciarViajeEnBD(origin, destinationLocation, routeCoordinates, distance)

            if (viajeId) {
                animateButton(() => {
                    navigation.navigate("NavegacionScreen", {
                        origin,
                        destinationLocation,
                        routeDetails: routeDetails || [],
                        viajeId: viajeId,
                    })
                })
            }
        } catch (error) {
            console.error("[v0] Error al iniciar viaje:", error)
        } finally {
            setIsStartingTrip(false)
        }
    }

    // Validar que tenemos los datos necesarios
    if (!destinationLocation) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <Text style={styles.errorText}>Error: No se recibió información del destino</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>Volver</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Mapa */}
            <MapView style={styles.map} region={region} showsUserLocation={true} loadingEnabled={true}>
                {origin && <Marker coordinate={origin} title="Ubicación Actual" pinColor="blue" />}

                {destinationLocation && (
                    <Marker
                        coordinate={{
                            latitude: destinationLocation.latitude || 0,
                            longitude: destinationLocation.longitude || 0,
                        }}
                        title="Destino"
                        pinColor="red"
                    />
                )}

                {origin && destinationLocation && destinationLocation.latitude && destinationLocation.longitude && (
                    <MapViewDirections
                        origin={origin}
                        destination={{
                            latitude: destinationLocation.latitude,
                            longitude: destinationLocation.longitude,
                        }}
                        apikey={Config.GOOGLE_MAPS_APIKEY}
                        strokeWidth={5}
                        strokeColor="#FF6B35"
                        onStart={() => {
                            setLoadingRoute(true)
                        }}
                        onReady={(result) => {
                            if (result) {
                                setDistance(result.distance || 0)
                                setDuration(result.duration || 0)
                                setRouteDetails((result.legs && result.legs[0] && result.legs[0].steps) || [])

                                // Extraer coordenadas de la ruta para guardar en BD
                                if (result.coordinates && result.coordinates.length > 0) {
                                    setRouteCoordinates(result.coordinates)
                                }
                            }
                            setLoadingRoute(false)
                        }}
                        onError={(errorMessage) => {
                            console.log("[v0] Error en la dirección: ", errorMessage)
                            // Para misma ubicación, no es realmente un error
                            setDistance(0)
                            setDuration(0)
                            setRouteDetails([])
                            setRouteCoordinates([])
                            setLoadingRoute(false)
                        }}
                    />
                )}
            </MapView>

            {/* Header con menú y logo */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <TouchableOpacity style={styles.menuButton} onPress={handleMenu} activeOpacity={0.8}>
                    <Icon name="menu" size={wp(6)} color="#2C3E50" />
                </TouchableOpacity>

                <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                    <Image source={require("../../assets/DRIVESMART.png")} style={styles.logo} />
                </Animated.View>
            </Animated.View>

            {error && (
                <View
                    style={[
                        styles.errorBanner,
                        errorType === "error" && styles.errorBannerError,
                        errorType === "warning" && styles.errorBannerWarning,
                        errorType === "info" && styles.errorBannerInfo,
                    ]}
                >
                    <Icon
                        name={errorType === "error" ? "error" : errorType === "warning" ? "warning" : "info"}
                        size={wp(4.5)}
                        color="#FFFFFF"
                    />
                    <Text style={styles.errorBannerText}>{error}</Text>
                    <TouchableOpacity onPress={handleRetryAddress} style={styles.retryButton}>
                        <Icon name="refresh" size={wp(4.5)} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Tarjeta inferior */}
            <Animated.View
                style={[
                    styles.bottomCard,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideUpAnim }],
                    },
                ]}
            >
                <View style={styles.cardHeader}>
                    <Icon name="route" size={wp(6)} color="#FF6B35" />
                    <Text style={styles.title}>Confirmar Recorrido</Text>
                </View>

                <View style={styles.routeInfo}>
                    {/* Punto de inicio */}
                    <View style={styles.locationItem}>
                        <View style={styles.locationIcon}>
                            <Icon name="my-location" size={wp(5)} color="#4CAF50" />
                        </View>
                        <View style={styles.locationDetails}>
                            <Text style={styles.locationLabel}>Punto de Inicio</Text>
                            <Text style={styles.locationAddress} numberOfLines={2}>
                                {originAddress || "Obteniendo ubicación..."}
                            </Text>
                        </View>
                    </View>

                    {/* Línea conectora */}
                    <View style={styles.connector}>
                        <View style={styles.connectorLine} />
                    </View>

                    {/* Punto de destino */}
                    <View style={styles.locationItem}>
                        <View style={[styles.locationIcon, { backgroundColor: "#FFE8E8" }]}>
                            <Icon name="place" size={wp(5)} color="#FF6B35" />
                        </View>
                        <View style={styles.locationDetails}>
                            <Text style={styles.locationLabel}>Punto de Llegada</Text>
                            <Text style={styles.locationAddress} numberOfLines={2}>
                                {destinationAddress || "Cargando destino..."}
                            </Text>
                        </View>
                    </View>

                    {/* Información de ruta */}
                    {distance !== null && duration !== null && (
                        <View style={styles.routeStats}>
                            <View style={styles.statItem}>
                                <Icon name="straighten" size={wp(4)} color="#FF6B35" />
                                <Text style={styles.statLabel}>Distancia</Text>
                                <Text style={styles.statValue}>{distance === 0 ? "0 m" : `${(distance || 0).toFixed(1)} km`}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Icon name="schedule" size={wp(4)} color="#FF6B35" />
                                <Text style={styles.statLabel}>Tiempo</Text>
                                <Text style={styles.statValue}>{duration === 0 ? "0 min" : `${Math.ceil(duration || 0)} min`}</Text>
                            </View>
                        </View>
                    )}

                    {/* Indicador de carga */}
                    {(loadingRoute || isStartingTrip) && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#FF6B35" />
                            <Text style={styles.loadingText}>{isStartingTrip ? "Iniciando viaje..." : "Calculando ruta..."}</Text>
                        </View>
                    )}
                </View>

                {/* Botones */}
                <Animated.View style={[styles.buttons, { transform: [{ scale: buttonScale }] }]}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
                        <Icon name="close" size={wp(4)} color="#FFFFFF" />
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.startButton, (loadingRoute || isStartingTrip) && styles.startButtonDisabled]}
                        onPress={handleStart}
                        disabled={loadingRoute || isStartingTrip}
                        activeOpacity={0.8}
                    >
                        <Icon name="navigation" size={wp(4)} color="#FFFFFF" />
                        <Text style={styles.startButtonText}>{isStartingTrip ? "Iniciando..." : "Empezar"}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Modal de Alerta de Restricción */}
            <Modal visible={showRestrictionAlert} transparent={true} animationType="none">
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.restrictionAlertContainer,
                            {
                                opacity: fadeAlertAnim,
                                transform: [{ translateY: slideAlertAnim }, { scale: pulseAnim }],
                            },
                        ]}
                    >
                        {/* Header de la alerta */}
                        <View style={styles.restrictionAlertHeader}>
                            <View style={styles.warningIconContainer}>
                                <Icon name="warning" size={wp(8)} color="#FFFFFF" />
                            </View>
                            <TouchableOpacity style={styles.closeAlertButton} onPress={closeRestrictionAlert}>
                                <Icon name="close" size={wp(6)} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Contenido de la alerta */}
                        <View style={styles.restrictionAlertContent}>
                            <Text style={styles.restrictionAlertTitle}>{restrictionAlertData?.title}</Text>
                            <Text style={styles.restrictionAlertMessage}>{restrictionAlertData?.message}</Text>

                            {/* Información de la placa */}
                            <View style={styles.plateContainer}>
                                <Text style={styles.plateLabel}>Tu Placa:</Text>
                                <View style={styles.plateDisplay}>
                                    <Text style={styles.plateText}>{restrictionAlertData?.userPlate}</Text>
                                </View>
                            </View>

                            {/* Información del horario */}
                            <View style={styles.timeContainer}>
                                <Icon name="schedule" size={wp(5)} color="#FF6B35" />
                                <View style={styles.timeInfo}>
                                    <Text style={styles.timeLabel}>Estado Actual:</Text>
                                    <Text style={styles.timeStatus}>{getCurrentTime()}</Text>
                                </View>
                            </View>

                            {/* Información adicional */}
                            <View style={styles.infoContainer}>
                                <Icon name="info-outline" size={wp(4)} color="#7F8C8D" />
                                <Text style={styles.infoText}>Horario de restricción: Lunes a Viernes de 07:00 a 19:00</Text>
                            </View>

                            {/* Pregunta al usuario */}
                            <View style={styles.questionContainer}>
                                <Text style={styles.questionText}>¿Deseas continuar de todas formas?</Text>
                            </View>
                        </View>

                        {/* Botones de acción */}
                        <View style={styles.restrictionAlertActions}>
                            <TouchableOpacity style={styles.cancelRestrictionButton} onPress={closeRestrictionAlert}>
                                <Icon name="cancel" size={wp(5)} color="#FFFFFF" />
                                <Text style={styles.cancelRestrictionButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.continueButton} onPress={handleContinueDespiteRestriction}>
                                <Icon name="check-circle" size={wp(5)} color="#FFFFFF" />
                                <Text style={styles.continueButtonText}>Continuar</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    map: {
        flex: 1,
    },
    header: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(6) : hp(4),
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: wp(4),
        zIndex: 10,
    },
    menuButton: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(2.5),
        padding: wp(2.5),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
    },
    logo: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    errorBanner: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(16) : hp(14),
        left: wp(4),
        right: wp(4),
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: hp(1.2),
        paddingHorizontal: wp(3),
        borderRadius: wp(2),
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    errorBannerError: {
        backgroundColor: "#E74C3C",
    },
    errorBannerWarning: {
        backgroundColor: "#F39C12",
    },
    errorBannerInfo: {
        backgroundColor: "#3498DB",
    },
    errorBannerText: {
        flex: 1,
        color: "#FFFFFF",
        fontSize: wp(3.2),
        fontWeight: "600",
        marginLeft: wp(2),
    },
    retryButton: {
        padding: wp(1),
    },
    bottomCard: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: wp(5),
        borderTopRightRadius: wp(5),
        paddingHorizontal: wp(4),
        paddingTop: wp(4),
        paddingBottom: Platform.OS === "ios" ? hp(4) : wp(4),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
        maxHeight: hp(50),
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: hp(2),
        paddingBottom: hp(1),
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    title: {
        fontSize: wp(4.5),
        fontWeight: "bold",
        color: "#2C3E50",
        marginLeft: wp(2),
    },
    routeInfo: {
        flex: 1,
    },
    locationItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: hp(1),
    },
    locationIcon: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        backgroundColor: "#E8F5E8",
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp(3),
    },
    locationDetails: {
        flex: 1,
    },
    locationLabel: {
        fontSize: wp(3.2),
        fontWeight: "600",
        color: "#7F8C8D",
        marginBottom: 2,
    },
    locationAddress: {
        fontSize: wp(3.8),
        color: "#2C3E50",
        lineHeight: wp(5),
    },
    connector: {
        alignItems: "center",
        marginVertical: hp(0.5),
    },
    connectorLine: {
        width: 2,
        height: hp(2),
        backgroundColor: "#E1E8ED",
    },
    routeStats: {
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        paddingVertical: hp(1.5),
        marginTop: hp(1.5),
        marginBottom: hp(1),
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statLabel: {
        fontSize: wp(3),
        color: "#7F8C8D",
        marginTop: 2,
    },
    statValue: {
        fontSize: wp(3.8),
        fontWeight: "bold",
        color: "#2C3E50",
        marginTop: 2,
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: hp(2),
    },
    loadingText: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        marginLeft: wp(2),
    },
    buttons: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: wp(3),
        marginTop: hp(1),
    },
    cancelButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E74C3C",
        borderRadius: wp(3),
        paddingVertical: hp(1.8),
        shadowColor: "#E74C3C",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    cancelButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.8),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    startButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(3),
        paddingVertical: hp(1.8),
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    startButtonDisabled: {
        backgroundColor: "#BDC3C7",
        shadowOpacity: 0.1,
    },
    startButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.8),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    errorText: {
        fontSize: wp(4),
        color: "#E74C3C",
        textAlign: "center",
        marginBottom: hp(2),
    },
    backButton: {
        backgroundColor: "#FF6B35",
        paddingHorizontal: wp(6),
        paddingVertical: hp(1.5),
        borderRadius: wp(3),
    },
    backButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: wp(4),
    },
    restrictionAlertContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(4),
        width: "100%",
        maxWidth: wp(90),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        overflow: "hidden",
    },
    restrictionAlertHeader: {
        backgroundColor: "#E74C3C",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: wp(4),
        paddingVertical: wp(3),
    },
    warningIconContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: wp(6),
        padding: wp(2),
    },
    closeAlertButton: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: wp(4),
        padding: wp(1.5),
    },
    restrictionAlertContent: {
        padding: wp(5),
    },
    restrictionAlertTitle: {
        fontSize: wp(5.5),
        fontWeight: "bold",
        color: "#E74C3C",
        textAlign: "center",
        marginBottom: wp(3),
    },
    restrictionAlertMessage: {
        fontSize: wp(4),
        color: "#2C3E50",
        textAlign: "center",
        lineHeight: wp(5.5),
        marginBottom: wp(4),
    },
    plateContainer: {
        alignItems: "center",
        marginBottom: wp(4),
    },
    plateLabel: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        marginBottom: wp(2),
    },
    plateDisplay: {
        backgroundColor: "#2C3E50",
        borderRadius: wp(2),
        paddingHorizontal: wp(4),
        paddingVertical: wp(2),
        borderWidth: 2,
        borderColor: "#FF6B35",
    },
    plateText: {
        fontSize: wp(5),
        fontWeight: "bold",
        color: "#FFFFFF",
        letterSpacing: 2,
    },
    timeContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF5F2",
        borderRadius: wp(2),
        padding: wp(3),
        marginBottom: wp(3),
    },
    timeInfo: {
        marginLeft: wp(2),
        flex: 1,
    },
    timeLabel: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
    },
    timeStatus: {
        fontSize: wp(3.5),
        fontWeight: "600",
        color: "#FF6B35",
    },
    infoContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(2),
        padding: wp(3),
        marginBottom: wp(3),
    },
    infoText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginLeft: wp(2),
        flex: 1,
        lineHeight: wp(4.5),
    },
    questionContainer: {
        backgroundColor: "#FFF3E0",
        borderRadius: wp(2),
        padding: wp(3),
        borderLeftWidth: 4,
        borderLeftColor: "#FF6B35",
    },
    questionText: {
        fontSize: wp(3.8),
        color: "#2C3E50",
        fontWeight: "600",
        textAlign: "center",
    },
    restrictionAlertActions: {
        flexDirection: "row",
        padding: wp(4),
        paddingTop: 0,
        gap: wp(2),
    },
    cancelRestrictionButton: {
        flex: 1,
        backgroundColor: "#95A5A6",
        borderRadius: wp(3),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: wp(3.5),
        shadowColor: "#95A5A6",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    cancelRestrictionButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
    continueButton: {
        flex: 1,
        backgroundColor: "#F39C12",
        borderRadius: wp(3),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: wp(3.5),
        shadowColor: "#F39C12",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    continueButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
})

export default ConfirmarRecorridoScreen
