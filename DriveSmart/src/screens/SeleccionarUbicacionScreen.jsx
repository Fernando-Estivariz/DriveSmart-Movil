"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import MapView from "react-native-maps"
import Geolocation from "@react-native-community/geolocation"
import Config from "react-native-config"
import { useNavigation } from "@react-navigation/native"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const SeleccionarUbicacionScreen = () => {
    const navigation = useNavigation()
    const [region, setRegion] = useState(null)
    const [markerPosition, setMarkerPosition] = useState(null)
    const [streetAddress, setStreetAddress] = useState("Cargando dirección...")
    const [isLoading, setIsLoading] = useState(true)
    const [isDragging, setIsDragging] = useState(false)
    const [connectionError, setConnectionError] = useState(null)
    const [retryCount, setRetryCount] = useState(0)
    const [isRetrying, setIsRetrying] = useState(false)

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(100)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current
    const markerBounce = useRef(new Animated.Value(1)).current

    const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                    ...options.headers,
                },
            })
            clearTimeout(timeoutId)
            return response
        } catch (error) {
            clearTimeout(timeoutId)
            if (error.name === "AbortError") {
                const timeoutError = new Error("La solicitud tardó demasiado tiempo. Verifica tu conexión a Internet.")
                timeoutError.code = "TIMEOUT"
                throw timeoutError
            }
            if (
                !error.message ||
                error.message.includes("Network request failed") ||
                error.message.includes("Failed to fetch")
            ) {
                const networkError = new Error("Sin conexión a Internet. Por favor, verifica tu conexión.")
                networkError.code = "NETWORK_ERROR"
                throw networkError
            }
            throw error
        }
    }

    const categorizeError = (error, context = "operación") => {
        console.error(`[Error en ${context}]:`, {
            message: error.message,
            code: error.code,
            stack: error.stack,
        })

        if (error.code === "TIMEOUT") {
            return {
                message: "La conexión es lenta. La dirección puede tardar en cargarse.",
                severity: "warning",
                canRetry: true,
            }
        }

        if (error.code === "NETWORK_ERROR") {
            return {
                message: "Sin conexión a Internet. Verifica tu conexión.",
                severity: "error",
                canRetry: true,
            }
        }

        if (error.message?.includes("401") || error.message?.includes("403")) {
            return {
                message: "Error de autenticación del servicio. Contacta con soporte.",
                severity: "error",
                canRetry: false,
            }
        }

        if (error.message?.includes("429")) {
            return {
                message: "Demasiadas solicitudes. Espera un momento.",
                severity: "warning",
                canRetry: true,
            }
        }

        if (error.message?.includes("500") || error.message?.includes("502") || error.message?.includes("503")) {
            return {
                message: "Servicio temporalmente no disponible. Intenta nuevamente.",
                severity: "warning",
                canRetry: true,
            }
        }

        return {
            message: "Error al obtener la dirección. Intenta nuevamente.",
            severity: "warning",
            canRetry: true,
        }
    }

    const getAddressFromCoordinates = async (latitude, longitude, isAutoRetry = false) => {
        try {
            setConnectionError(null)

            const response = await fetchWithTimeout(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${Config.GOOGLE_GEOCODING_API_KEY}&language=es`,
                {},
                10000,
            )

            if (!response.ok) {
                const errorMsg = new Error(`Error del servidor: ${response.status}`)
                errorMsg.code = `HTTP_${response.status}`
                throw errorMsg
            }

            const data = await response.json()

            if (data.status === "ZERO_RESULTS") {
                setConnectionError({
                    message: "No se encontró dirección para esta ubicación.",
                    severity: "info",
                    canRetry: false,
                })
                return "Ubicación sin dirección registrada"
            }

            if (data.status === "OVER_QUERY_LIMIT") {
                setConnectionError({
                    message: "Límite de solicitudes alcanzado. Espera un momento.",
                    severity: "warning",
                    canRetry: true,
                })
                return "Límite alcanzado"
            }

            if (data.status === "REQUEST_DENIED") {
                setConnectionError({
                    message: "Error de configuración del servicio. Contacta soporte.",
                    severity: "error",
                    canRetry: false,
                })
                return "Error de configuración"
            }

            if (data.results && data.results.length > 0) {
                const result = data.results[0]
                const addressComponents = result.address_components

                let streetNumber = ""
                let route = ""
                let locality = ""

                addressComponents.forEach((component) => {
                    if (component.types.includes("street_number")) {
                        streetNumber = component.long_name
                    }
                    if (component.types.includes("route")) {
                        route = component.long_name
                    }
                    if (component.types.includes("locality")) {
                        locality = component.long_name
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
                    address = result.formatted_address
                }

                setRetryCount(0)
                setIsRetrying(false)
                return address || "Dirección no disponible"
            } else {
                setConnectionError({
                    message: "No se pudo determinar la dirección.",
                    severity: "info",
                    canRetry: true,
                })
                return "Dirección no disponible"
            }
        } catch (error) {
            const errorInfo = categorizeError(error, "geocodificación")
            setConnectionError(errorInfo)

            if (errorInfo.canRetry && errorInfo.code === "NETWORK_ERROR" && retryCount < 2 && !isAutoRetry) {
                setRetryCount((prev) => prev + 1)
                setIsRetrying(true)
                setTimeout(() => {
                    getAddressFromCoordinates(latitude, longitude, true)
                }, 2000)
                return "Reintentando..."
            }

            if (errorInfo.code === "TIMEOUT") {
                return "Verificando dirección..."
            } else if (errorInfo.code === "NETWORK_ERROR") {
                return "Sin conexión"
            } else {
                return "Error al obtener dirección"
            }
        }
    }

    useEffect(() => {
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                const initialRegion = {
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }
                setRegion(initialRegion)
                setMarkerPosition({ latitude, longitude })

                const address = await getAddressFromCoordinates(latitude, longitude)
                setStreetAddress(address)

                setIsLoading(false)

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
                console.error("[Error de geolocalización]:", error)
                setIsLoading(false)
                setConnectionError({
                    message: "No se pudo obtener tu ubicación. Verifica los permisos de GPS.",
                    severity: "error",
                    canRetry: false,
                })
                setStreetAddress("Error al obtener ubicación")
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
        )
    }, [])

    const handleRegionChangeComplete = async (newRegion) => {
        setRegion(newRegion)
        const newPosition = {
            latitude: newRegion.latitude,
            longitude: newRegion.longitude,
        }
        setMarkerPosition(newPosition)
        setIsDragging(false)

        setStreetAddress("Obteniendo dirección...")
        setRetryCount(0)
        const address = await getAddressFromCoordinates(newRegion.latitude, newRegion.longitude)
        setStreetAddress(address)

        Animated.sequence([
            Animated.timing(markerBounce, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(markerBounce, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const handleRegionChange = () => {
        setIsDragging(true)
        setStreetAddress("Moviendo...")
    }

    const animateButton = () => {
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
    }

    const handleReady = () => {
        if (markerPosition) {
            animateButton()
            navigation.navigate("ConfirmarRecorridoScreen", {
                destinationLocation: {
                    ...markerPosition,
                    address: streetAddress || "Destino seleccionado",
                },
            })
        }
    }

    const isButtonEnabled = () => {
        return markerPosition !== null
    }

    const getButtonText = () => {
        return "Confirmar Ubicación"
    }

    const handleMyLocation = () => {
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                const newRegion = {
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }
                setRegion(newRegion)
                setMarkerPosition({ latitude, longitude })

                setStreetAddress("Obteniendo dirección...")
                setRetryCount(0)
                setConnectionError(null)
                const address = await getAddressFromCoordinates(latitude, longitude)
                setStreetAddress(address)
            },
            (error) => {
                console.error("[Error de geolocalización]:", error)
                setConnectionError({
                    message: "Error al obtener tu ubicación actual. Verifica que el GPS esté activado.",
                    severity: "error",
                    canRetry: false,
                })
                setStreetAddress("Error al obtener ubicación")
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
        )
    }

    const handleRetryAddress = async () => {
        if (markerPosition) {
            setConnectionError(null)
            setRetryCount(0)
            setIsRetrying(false)
            setStreetAddress("Obteniendo dirección...")
            const address = await getAddressFromCoordinates(markerPosition.latitude, markerPosition.longitude)
            setStreetAddress(address)
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Mapa sin marcadores */}
            {region && (
                <MapView
                    style={styles.map}
                    region={region}
                    onRegionChange={handleRegionChange}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    showsUserLocation={true}
                    loadingEnabled={true}
                    showsMyLocationButton={false}
                    showsCompass={false}
                    toolbarEnabled={false}
                />
            )}

            {/* Indicador central del mapa (puntero naranja) */}
            <Animated.View
                style={[
                    styles.centerMarker,
                    {
                        transform: [{ scale: markerBounce }],
                    },
                ]}
            >
                <View style={styles.markerContainer}>
                    <Icon name="place" size={wp(8)} color="#FF6B35" />
                </View>
                <View style={styles.markerShadow} />
            </Animated.View>

            {/* Header con navegación y logo */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                    <Icon name="arrow-back" size={wp(6)} color="#2C3E50" />
                </TouchableOpacity>

                <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                    <Image source={require("../../assets/DRIVESMART.png")} style={styles.logo} />
                </Animated.View>
            </Animated.View>

            {/* Información de ayuda */}
            <Animated.View
                style={[
                    styles.helpContainer,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <View style={styles.helpBox}>
                    <Icon name="info" size={wp(4)} color="#FF6B35" />
                    <Text style={styles.helpText}>Arrastra el mapa para seleccionar tu destino</Text>
                </View>
            </Animated.View>

            {connectionError && (
                <Animated.View
                    style={[
                        styles.errorContainer,
                        {
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.errorBox,
                            connectionError.severity === "error" && styles.errorBoxError,
                            connectionError.severity === "warning" && styles.errorBoxWarning,
                            connectionError.severity === "info" && styles.errorBoxInfo,
                        ]}
                    >
                        <Icon
                            name={
                                connectionError.severity === "error"
                                    ? "error"
                                    : connectionError.severity === "warning"
                                        ? "warning"
                                        : "info"
                            }
                            size={wp(4.5)}
                            color={
                                connectionError.severity === "error"
                                    ? "#E74C3C"
                                    : connectionError.severity === "warning"
                                        ? "#F39C12"
                                        : "#3498DB"
                            }
                        />
                        <Text
                            style={[
                                styles.errorText,
                                connectionError.severity === "error" && styles.errorTextError,
                                connectionError.severity === "warning" && styles.errorTextWarning,
                                connectionError.severity === "info" && styles.errorTextInfo,
                            ]}
                        >
                            {connectionError.message}
                        </Text>
                        {connectionError.canRetry && (
                            <TouchableOpacity onPress={handleRetryAddress} style={styles.retryButton}>
                                <Icon name="refresh" size={wp(4)} color="#FF6B35" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {isRetrying && retryCount > 0 && (
                        <View style={styles.retryInfo}>
                            <Text style={styles.retryInfoText}>Reintentando... ({retryCount}/2)</Text>
                        </View>
                    )}
                </Animated.View>
            )}

            {/* Botón de mi ubicación */}
            <Animated.View
                style={[
                    styles.myLocationContainer,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation} activeOpacity={0.8}>
                    <Icon name="my-location" size={wp(5)} color="#FF6B35" />
                </TouchableOpacity>
            </Animated.View>

            {/* Contenedor de botones inferior */}
            <Animated.View
                style={[
                    styles.bottomContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideUpAnim }],
                    },
                ]}
            >
                {/* Información de ubicación */}
                <View style={styles.locationInfo}>
                    <Icon name="place" size={wp(5)} color="#FF6B35" />
                    <View style={styles.locationTextContainer}>
                        <Text style={styles.locationTitle}>Ubicación seleccionada</Text>
                        <Text style={styles.locationAddress} numberOfLines={2}>
                            {streetAddress || "Cargando dirección..."}
                        </Text>
                    </View>
                </View>

                {/* Botón de confirmar */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                        style={[styles.readyButton, !isButtonEnabled() && styles.readyButtonDisabled]}
                        onPress={handleReady}
                        disabled={!isButtonEnabled()}
                        activeOpacity={0.8}
                    >
                        <Icon name="check-circle" size={wp(5)} color="#FFFFFF" />
                        <Text style={styles.readyButtonText}>{getButtonText()}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Indicador de carga */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingBox}>
                        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
                    </View>
                </View>
            )}
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
    backButton: {
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
    centerMarker: {
        position: "absolute",
        top: "50%",
        left: "50%",
        marginLeft: -wp(4),
        marginTop: -wp(8),
        alignItems: "center",
        zIndex: 5,
    },
    markerContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(6),
        padding: wp(1),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    markerShadow: {
        width: wp(2),
        height: wp(1),
        backgroundColor: "rgba(0,0,0,0.2)",
        borderRadius: wp(1),
        marginTop: wp(1),
    },
    helpContainer: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(15) : hp(13),
        left: wp(4),
        right: wp(4),
        zIndex: 10,
    },
    helpBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: wp(2),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    helpText: {
        fontSize: wp(3.2),
        color: "#2C3E50",
        marginLeft: wp(2),
        fontWeight: "500",
    },
    errorContainer: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(21) : hp(19),
        left: wp(4),
        right: wp(4),
        zIndex: 10,
    },
    errorBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF5F5",
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: wp(2.5),
        borderLeftWidth: 4,
        borderLeftColor: "#E74C3C",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    errorBoxError: {
        backgroundColor: "#FFEBEE",
        borderLeftColor: "#E74C3C",
    },
    errorBoxWarning: {
        backgroundColor: "#FFF3E0",
        borderLeftColor: "#F39C12",
    },
    errorBoxInfo: {
        backgroundColor: "#E3F2FD",
        borderLeftColor: "#3498DB",
    },
    errorText: {
        flex: 1,
        fontSize: wp(3.2),
        color: "#E74C3C",
        marginLeft: wp(2),
        fontWeight: "500",
    },
    errorTextError: {
        color: "#C0392B",
    },
    errorTextWarning: {
        color: "#E67E22",
    },
    errorTextInfo: {
        color: "#2980B9",
    },
    retryButton: {
        padding: wp(1.5),
        marginLeft: wp(2),
    },
    retryInfo: {
        marginTop: wp(2),
        backgroundColor: "#FFFFFF",
        borderRadius: wp(1.5),
        paddingHorizontal: wp(3),
        paddingVertical: wp(1.5),
        alignItems: "center",
    },
    retryInfoText: {
        fontSize: wp(2.8),
        color: "#7F8C8D",
        fontWeight: "500",
    },
    myLocationContainer: {
        position: "absolute",
        right: wp(4),
        bottom: hp(25),
        zIndex: 10,
    },
    myLocationButton: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(6),
        padding: wp(3),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
    },
    bottomContainer: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? hp(4) : hp(2),
        left: wp(4),
        right: wp(4),
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        padding: wp(4),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    locationInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: hp(2),
        paddingBottom: hp(2),
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    locationTextContainer: {
        flex: 1,
        marginLeft: wp(3),
    },
    locationTitle: {
        fontSize: wp(3.8),
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: 4,
    },
    locationAddress: {
        fontSize: wp(3.4),
        color: "#7F8C8D",
        lineHeight: wp(4.5),
    },
    readyButton: {
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
    readyButtonDisabled: {
        backgroundColor: "#BDC3C7",
        shadowOpacity: 0.1,
    },
    readyButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
    loadingContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255,255,255,0.9)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 20,
    },
    loadingBox: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        padding: wp(4),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
    },
    loadingText: {
        fontSize: wp(4),
        color: "#2C3E50",
        fontWeight: "500",
    },
})

export default SeleccionarUbicacionScreen
