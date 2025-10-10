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
    Modal,
    ScrollView,
    Alert,
} from "react-native"
import MapView, { Marker, Polyline, Circle } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import Geolocation from "@react-native-community/geolocation"
import { useRoute, useNavigation } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialIcons"
import axios from "axios"
import Config from "react-native-config"
import Tts from "react-native-tts"
import AsyncStorage from "@react-native-async-storage/async-storage"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

// Constantes para navegación
const ARRIVAL_THRESHOLD = 50 // metros para considerar llegada
const REROUTE_THRESHOLD = 100 // metros para recalcular ruta
const MIN_LOCATION_ACCURACY = 20 // metros de precisión mínima
const LOCATION_UPDATE_INTERVAL = 2000 // ms entre actualizaciones

// Función para expandir abreviaciones en las instrucciones de voz
const expandAbbreviations = (text) => {
    const abbreviations = {
        // Tipos de vías
        "C\\.": "Calle",
        "c\\.": "calle",
        "Av\\.": "Avenida",
        "av\\.": "avenida",
        "Ave\\.": "Avenida",
        "ave\\.": "avenida",
        "Blvd\\.": "Boulevard",
        "blvd\\.": "boulevard",
        "Carr\\.": "Carrera",
        "carr\\.": "carrera",
        "Cra\\.": "Carrera",
        "cra\\.": "carrera",
        "Diag\\.": "Diagonal",
        "diag\\.": "diagonal",
        "Tr\\.": "Transversal",
        "tr\\.": "transversal",
        "Tv\\.": "Transversal",
        "tv\\.": "transversal",
        "Cl\\.": "Calle",
        "cl\\.": "calle",
        "Kr\\.": "Carrera",
        "kr\\.": "carrera",
        "Km\\.": "Kilmetro",
        "km\\.": "kilómetro",

        // Direcciones cardinales
        "N\\.": "Norte",
        "S\\.": "Sur",
        "E\\.": "Este",
        "O\\.": "Oeste",
        "NE\\.": "Noreste",
        "NO\\.": "Noroeste",
        "SE\\.": "Sureste",
        "SO\\.": "Suroeste",

        // Abreviaciones comunes
        "Dr\\.": "Doctor",
        "Dra\\.": "Doctora",
        "Sr\\.": "Señor",
        "Sra\\.": "Señora",
        "Sto\\.": "Santo",
        "Sta\\.": "Santa",
        "Gral\\.": "General",
        "Pdte\\.": "Presidente",
        "Tte\\.": "Teniente",
        "Cap\\.": "Capitán",
        "Col\\.": "Coronel",
        "Cmdte\\.": "Comandante",

        // Números ordinales
        "1°": "Primero",
        "2°": "Segundo",
        "3°": "Tercero",
        "4°": "Cuarto",
        "5°": "Quinto",
        "6°": "Sexto",
        "7°": "Séptimo",
        "8°": "Octavo",
        "9°": "Noveno",
        "10°": "Décimo",

        // Abreviaciones específicas de lugares
        "Pza\\.": "Plaza",
        "pza\\.": "plaza",
        "Plza\\.": "Plaza",
        "plza\\.": "plaza",
        "Pque\\.": "Parque",
        "pque\\.": "parque",
        "Bque\\.": "Bosque",
        "bque\\.": "bosque",
        "Urb\\.": "Urbanización",
        "urb\\.": "urbanización",
        "Res\\.": "Residencial",
        "res\\.": "residencial",
        "Conj\\.": "Conjunto",
        "conj\\.": "conjunto",
        "Ed\\.": "Edificio",
        "ed\\.": "edificio",
        "Edif\\.": "Edificio",
        "edif\\.": "edificio",
        "Apto\\.": "Apartamento",
        "apto\\.": "apartamento",
        "Apt\\.": "Apartamento",
        "apt\\.": "apartamento",
        "Of\\.": "Oficina",
        "loc\\.": "Local",
        "loc\\.": "local",

        // Medidas y distancias
        "m\\.": "metros",
        "mts\\.": "metros",
        "Mt\\.": "Metro",
        "mt\\.": "metro",
        "Mts\\.": "Metros",
        "mts\\.": "metros",

        // Abreviaciones de tiempo
        "min\\.": "minutos",
        "seg\\.": "segundos",
        "hr\\.": "hora",
        "hrs\\.": "horas",

        // Otras abreviaciones comunes
        "No\\.": "Número",
        "no\\.": "número",
        "Nro\\.": "Número",
        "nro\\.": "número",
        "#": "número",
        "Esc\\.": "Escuela",
        "esc\\.": "escuela",
        "Univ\\.": "Universidad",
        "univ\\.": "universidad",
        "Hosp\\.": "Hospital",
        "hosp\\.": "hospital",
        "Clín\\.": "Clínica",
        "clín\\.": "clínica",
        "Cia\\.": "Compañía",
        "cia\\.": "compañía",
        "Cía\\.": "Compañía",
        "cía\\.": "compañía",
        "Ltda\\.": "Limitada",
        "ltda\\.": "limitada",
        "S\\.A\\.": "Sociedad Anónima",
        "s\\.a\\.": "sociedad anónima",
    }

    let expandedText = text

    // Aplicar todas las expansiones
    Object.keys(abbreviations).forEach((abbrev) => {
        const regex = new RegExp(abbrev.replace(/\./g, "\\."), "g")
        expandedText = expandedText.replace(regex, abbreviations[abbrev])
    })

    // Casos especiales para números con letras (ej: "12A" -> "12 A")
    expandedText = expandedText.replace(/(\d+)([A-Za-z])\b/g, "$1 $2")

    // Casos especiales para guiones en direcciones (ej: "Calle 12-34" -> "Calle 12 número 34")
    expandedText = expandedText.replace(/(\d+)-(\d+)/g, "$1 número $2")

    // Mejorar la pronunciación de números grandes
    expandedText = expandedText.replace(/\b(\d{4,})\b/g, (match) => {
        // Para números de 4 dígitos o más, agregar pausas
        return match.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ")
    })

    return expandedText
}

const getEndCoordsForStreetName = (selectedParkingSpot, currentLocation) => {
    // 1) si hay estacionamiento elegido, usa su midPoint
    if (selectedParkingSpot?.midPoint?.latitude && selectedParkingSpot?.midPoint?.longitude) {
        return {
            lat: selectedParkingSpot.midPoint.latitude,
            lng: selectedParkingSpot.midPoint.longitude,
        }
    }
    // 2) si no, usa la ubicación actual
    if (currentLocation?.latitude && currentLocation?.longitude) {
        return {
            lat: currentLocation.latitude,
            lng: currentLocation.longitude,
        }
    }
    return null
}

const obtenerNombreCalle = async (latitude, longitude) => {
    try {
        console.log("[v0] Iniciando reverse geocoding para:", latitude, longitude)
        console.log("[v0] Google Maps API Key disponible:", !!Config.GOOGLE_MAPS_APIKEY)

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${Config.GOOGLE_MAPS_APIKEY}&language=es`
        console.log("[v0] URL de geocoding:", url.replace(Config.GOOGLE_MAPS_APIKEY, "API_KEY_HIDDEN"))

        const response = await fetch(url)
        console.log("[v0] Response status:", response.status)

        const data = await response.json()
        console.log("[v0] Geocoding response:", JSON.stringify(data, null, 2))

        if (data.results && data.results.length > 0) {
            // Buscar el componente de ruta (street)
            const addressComponents = data.results[0].address_components
            console.log("[v0] Address components:", addressComponents)

            const streetComponent = addressComponents.find(
                (component) => component.types.includes("route") || component.types.includes("street_address"),
            )

            if (streetComponent) {
                console.log("[v0] Street component encontrado:", streetComponent.long_name)
                return streetComponent.long_name
            }

            // Si no encuentra ruta específica, usar la dirección formateada
            const fallbackName = data.results[0].formatted_address.split(",")[0]
            console.log("[v0] Usando dirección formateada como fallback:", fallbackName)
            return fallbackName
        }

        console.log("[v0] No se encontraron resultados en geocoding")
        return "Calle no identificada"
    } catch (error) {
        console.log("[v0] Error obteniendo nombre de calle:", error)
        return "Calle no identificada"
    }
}

const NavegacionScreen = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { origin, destinationLocation, viajeId } = route.params

    const [currentLocation, setCurrentLocation] = useState(origin)
    const [routeDetails, setRouteDetails] = useState(null)
    const [steps, setSteps] = useState([])
    const [currentStep, setCurrentStep] = useState(0)
    const [is3DMode, setIs3DMode] = useState(false)
    const [isNavigationVisible, setIsNavigationVisible] = useState(true)
    const [showArrivalModal, setShowArrivalModal] = useState(false)
    const [showParkingModal, setShowParkingModal] = useState(false)
    const [showParkingOptionsModal, setShowParkingOptionsModal] = useState(false)
    const [showParkingPreview, setShowParkingPreview] = useState(false)
    const [isSearchingParking, setIsSearchingParking] = useState(false)
    const [parkingOptions, setParkingOptions] = useState([])
    const [allNearbyParking, setAllNearbyParking] = useState([])
    const [selectedParkingSpot, setSelectedParkingSpot] = useState(null)
    const [currentParkingIndex, setCurrentParkingIndex] = useState(0)
    const [isNavigatingToParking, setIsNavigatingToParking] = useState(false)
    const [navigationMode, setNavigationMode] = useState("destination") // "destination" | "parking" | "preview"
    const [showParkingRadius, setShowParkingRadius] = useState(false)
    const [hasInitializedRoute, setHasInitializedRoute] = useState(false)

    // Estados para control de navegación mejorado
    const [hasArrived, setHasArrived] = useState(false) // Inicializado a false
    const [isRecalculating, setIsRecalculating] = useState(false) // Inicializado a false
    const [lastValidLocation, setLastValidLocation] = useState(origin)
    const [routeCoordinates, setRouteCoordinates] = useState([])
    const [isOffRoute, setIsOffRoute] = useState(false) // Inicializado a false
    const [consecutiveArrivalChecks, setConsecutiveArrivalChecks] = useState(0)

    // Estados para tracking del viaje
    const [totalDistanceTraveled, setTotalDistanceTraveled] = useState(0)
    const [lastLocationForDistance, setLastLocationForDistance] = useState(origin)

    const mapRef = useRef(null)
    const locationWatchId = useRef(null)
    const recalculateTimeoutRef = useRef(null)

    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false) // Inicializado a false
    const [lastSpokenInstruction, setLastSpokenInstruction] = useState("")

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(100)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const previewSlideAnim = useRef(new Animated.Value(-100)).current

    // Animaciones para el modal de llegada
    const modalFadeAnim = useRef(new Animated.Value(0)).current
    const modalScaleAnim = useRef(new Animated.Value(0.5)).current
    const confettiAnim = useRef(new Animated.Value(0)).current
    const checkmarkScale = useRef(new Animated.Value(0)).current
    const pulseAnim = useRef(new Animated.Value(1)).current

    // Animaciones para el modal de estacionamiento
    const parkingModalFadeAnim = useRef(new Animated.Value(0)).current
    const parkingModalScaleAnim = useRef(new Animated.Value(0.5)).current

    const voiceButtonScale = useRef(new Animated.Value(1)).current
    const voicePulseAnim = useRef(new Animated.Value(1)).current

    // Función para actualizar distancia en BD
    const actualizarDistanciaEnBD = async (distanciaRecorrida) => {
        try {
            const token = await AsyncStorage.getItem("authToken")
            if (!token || !viajeId) return

            await axios.put(
                `${Config.API_URL}/viajes/${viajeId}/actualizar-distancia`,
                {
                    distancia_recorrida: distanciaRecorrida,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 5000,
                },
            )
        } catch (error) {
            console.error("Error actualizando distancia en BD:", error)
        }
    }

    // Función para iniciar búsqueda de estacionamiento en BD
    const iniciarBusquedaEstacionamientoEnBD = async (ubicacionBusqueda) => {
        try {
            const token = await AsyncStorage.getItem("authToken")
            if (!token || !viajeId) return

            await axios.post(
                `${Config.API_URL}/viajes/${viajeId}/buscar-estacionamiento`,
                {
                    ubicacion_busqueda_lat: ubicacionBusqueda.latitude,
                    ubicacion_busqueda_lng: ubicacionBusqueda.longitude,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 5000,
                },
            )
        } catch (error) {
            console.error("Error iniciando búsqueda en BD:", error)
        }
    }

    const finalizarViajeEnBD = async (datosFinalizacion) => {
        try {
            const token = await AsyncStorage.getItem("authToken")
            if (!token || !viajeId) {
                console.log("[v0] No se puede finalizar: token o viajeId faltante")
                return
            }

            // Si no viene calle, intenta resolverla con las coords finales
            let calle = datosFinalizacion.calle_estacionamiento || null
            if (!calle && datosFinalizacion.ubicacion_final_lat && datosFinalizacion.ubicacion_final_lng) {
                console.log("[v0] Resolviendo nombre de calle con coordenadas finales")
                calle = await obtenerNombreCalle(datosFinalizacion.ubicacion_final_lat, datosFinalizacion.ubicacion_final_lng)
            }

            let idMapeadoNumerico = null
            if (datosFinalizacion.id_mapeado) {
                if (typeof datosFinalizacion.id_mapeado === "string") {
                    // Extract numbers from string like "parking-231-1757963939644"
                    const match = datosFinalizacion.id_mapeado.match(/\d+/g)
                    if (match && match.length > 0) {
                        // Use the last number which is usually the timestamp/ID
                        idMapeadoNumerico = Number.parseInt(match[match.length - 1])
                    }
                } else {
                    idMapeadoNumerico = datosFinalizacion.id_mapeado
                }
            }

            // Validar datos requeridos
            const datosValidados = {
                estado: datosFinalizacion.estado || "completado",
                distancia_final: datosFinalizacion.distancia_final || 0,
                encontro_lugar_busqueda: !!datosFinalizacion.encontro_lugar_busqueda,
                ubicacion_final_lat: datosFinalizacion.ubicacion_final_lat || 0,
                ubicacion_final_lng: datosFinalizacion.ubicacion_final_lng || 0,
                id_mapeado: idMapeadoNumerico,
                calle_estacionamiento: calle || "Calle no identificada",
            }

            console.log("[v0] Enviando datos a BD:", datosValidados)

            await axios.post(`${Config.API_URL}/viajes/${viajeId}/finalizar`, datosValidados, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            })

            console.log("[v0] Viaje finalizado exitosamente en BD")
        } catch (error) {
            console.error("Error finalizando viaje en BD:", error)
            if (error.response) {
                console.error("Respuesta del servidor:", error.response.data)
                console.error("Status:", error.response.status)
            }
        }
    }

    useEffect(() => {
        // Animaciones de entrada
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideUpAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start()

        return () => {
            // Limpiar watchers y timeouts
            if (locationWatchId.current) {
                Geolocation.clearWatch(locationWatchId.current)
            }
            if (recalculateTimeoutRef.current) {
                clearTimeout(recalculateTimeoutRef.current)
            }
        }
    }, [])

    // Función para calcular distancia entre dos puntos
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371 // Radio de la Tierra en km
        const dLat = ((lat2 - lat1) * Math.PI) / 180
        const dLon = ((lon2 - lon1) * Math.PI) / 180
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c * 1000 // Convertir a metros
    }

    // Función para validar si una ubicación es válida
    const isValidLocation = (location, accuracy = null) => {
        if (!location || !location.latitude || !location.longitude) {
            return false
        }

        // Verificar que las coordenadas estén en rangos válidos
        if (location.latitude < -90 || location.latitude > 90) {
            return false
        }
        if (location.longitude < -180 || location.longitude > 180) {
            return false
        }

        // Verificar precisión si está disponible
        if (accuracy && accuracy > MIN_LOCATION_ACCURACY) {
            return false
        }

        // Verificar que no sea un salto muy grande desde la última ubicación válida
        if (lastValidLocation) {
            const distance = calculateDistance(
                lastValidLocation.latitude,
                lastValidLocation.longitude,
                location.latitude,
                location.longitude,
            )
            // Si el salto es mayor a 500m en menos de 5 segundos, probablemente es un error
            if (distance > 500) {
                console.warn("🚨 Salto de ubicación muy grande detectado:", distance, "metros")
                return false
            }
        }

        return true
    }

    // Función para verificar si el usuario está fuera de la ruta
    const checkIfOffRoute = (currentPos, routeCoords) => {
        if (!routeCoords || routeCoords.length === 0) {
            return false
        }

        let minDistance = Number.POSITIVE_INFINITY

        // Encontrar la distancia mínima a cualquier punto de la ruta
        routeCoords.forEach((routePoint) => {
            const distance = calculateDistance(
                currentPos.latitude,
                currentPos.longitude,
                routePoint.latitude,
                routePoint.longitude,
            )
            if (distance < minDistance) {
                minDistance = distance
            }
        })

        return minDistance > REROUTE_THRESHOLD
    }

    // Función para recalcular la ruta
    const recalculateRoute = async () => {
        if (isRecalculating) {
            return
        }

        console.log("🔄 Recalculando ruta...")
        setIsRecalculating(true)
        setIsOffRoute(false)

        try {
            // Forzar una nueva consulta a la API de direcciones
            setHasInitializedRoute(false)

            // Pequeño delay para evitar múltiples llamadas
            await new Promise((resolve) => setTimeout(resolve, 1000))

            if (isVoiceEnabled) {
                speakInstruction("Recalculando ruta")
            }
        } catch (error) {
            console.error("❌ Error recalculando ruta:", error)
        } finally {
            setIsRecalculating(false)
        }
    }

    // Geolocalización mejorada en tiempo real
    useEffect(() => {
        const watchOptions = {
            enableHighAccuracy: true,
            distanceFilter: 5, // Actualizar cada 5 metros
            interval: LOCATION_UPDATE_INTERVAL,
            fastestInterval: 1000,
        }

        locationWatchId.current = Geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords
                const newLocation = { latitude, longitude }

                // Validar la nueva ubicación
                if (!isValidLocation(newLocation, accuracy)) {
                    console.warn("🚨 Ubicación inválida ignorada")
                    return
                }

                console.log("📍 Nueva ubicación válida:", newLocation, "Precisión:", accuracy)

                // Calcular distancia recorrida
                if (lastLocationForDistance) {
                    const distanceFromLast = calculateDistance(
                        lastLocationForDistance.latitude,
                        lastLocationForDistance.longitude,
                        newLocation.latitude,
                        newLocation.longitude,
                    )

                    // Solo sumar si la distancia es razonable (menos de 100m entre updates)
                    if (distanceFromLast > 0 && distanceFromLast < 100) {
                        const newTotalDistance = totalDistanceTraveled + distanceFromLast / 1000 // convertir a km
                        setTotalDistanceTraveled(newTotalDistance)

                        // Actualizar en BD cada 500m recorridos
                        if (Math.floor(newTotalDistance * 2) > Math.floor(totalDistanceTraveled * 2)) {
                            actualizarDistanciaEnBD(newTotalDistance)
                        }
                    }
                }

                // Actualizar ubicación actual
                setCurrentLocation(newLocation)
                setLastValidLocation(newLocation)
                setLastLocationForDistance(newLocation)

                // Verificar si está fuera de la ruta (solo si ya tenemos una ruta)
                if (routeCoordinates.length > 0 && !isRecalculating && hasInitializedRoute) {
                    const offRoute = checkIfOffRoute(newLocation, routeCoordinates)

                    if (offRoute && !isOffRoute) {
                        console.log("🛣️ Usuario fuera de la ruta, programando recálculo...")
                        setIsOffRoute(true)

                        // Recalcular después de un pequeño delay para evitar múltiples recálculos
                        if (recalculateTimeoutRef.current) {
                            clearTimeout(recalculateTimeoutRef.current)
                        }

                        recalculateTimeoutRef.current = setTimeout(() => {
                            recalculateRoute()
                        }, 3000) // Esperar 3 segundos antes de recalcular
                    }
                }
            },
            (error) => {
                console.error("❌ Error de geolocalización:", error)
                // En caso de error, mantener la última ubicación válida
            },
            watchOptions,
        )

        return () => {
            if (locationWatchId.current) {
                Geolocation.clearWatch(locationWatchId.current)
            }
        }
    }, [
        routeCoordinates,
        isRecalculating,
        hasInitializedRoute,
        isOffRoute,
        totalDistanceTraveled,
        lastLocationForDistance,
    ])

    // Configuración de Text-to-Speech
    useEffect(() => {
        // Configurar TTS
        Tts.setDefaultLanguage("es-ES")
        Tts.setDefaultRate(0.6)
        Tts.setDefaultPitch(1.0)

        // Listeners para el estado del TTS
        Tts.addEventListener("tts-start", () => setIsSpeaking(true))
        Tts.addEventListener("tts-finish", () => setIsSpeaking(false))
        Tts.addEventListener("tts-cancel", () => setIsSpeaking(false))

        return () => {
            Tts.removeAllListeners("tts-start")
            Tts.removeAllListeners("tts-finish")
            Tts.removeAllListeners("tts-cancel")
            Tts.stop()
        }
    }, [])

    // Función para alternar el asistente de voz
    const toggleVoiceAssistant = () => {
        const newVoiceState = !isVoiceEnabled
        setIsVoiceEnabled(newVoiceState)

        // Animación del botón
        Animated.sequence([
            Animated.timing(voiceButtonScale, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(voiceButtonScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start()

        if (newVoiceState) {
            // Activar asistente
            speakInstruction("Asistente de navegación activado")
            startVoicePulse()
        } else {
            // Desactivar asistente
            Tts.stop()
            setIsSpeaking(false)
            stopVoicePulse()
            speakInstruction("Asistente de navegación desactivado")
        }
    }

    // Función para hablar una instrucción
    const speakInstruction = (text) => {
        if (isVoiceEnabled && text && text !== lastSpokenInstruction) {
            // Limpiar HTML tags y caracteres especiales
            let cleanText = text
                .replace(/<\/?[^>]+(>|$)/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "y")
                .replace(/&lt;/g, "")
                .replace(/&gt;/g, "")
                .trim()

            // Expandir abreviaciones para mejor pronunciación
            cleanText = expandAbbreviations(cleanText)

            if (cleanText.length > 0) {
                Tts.speak(cleanText)
                setLastSpokenInstruction(text)
            }
        }
    }

    // Función para iniciar la animación de pulso cuando está hablando
    const startVoicePulse = () => {
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(voicePulseAnim, {
                    toValue: 1.2,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(voicePulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
        )
        pulseAnimation.start()
        return pulseAnimation
    }

    // Función para detener la animación de pulso
    const stopVoicePulse = () => {
        voicePulseAnim.stopAnimation()
        voicePulseAnim.setValue(1)
    }

    const updateCamera = (location) => {
        if (mapRef.current) {
            mapRef.current.animateCamera({
                center: location,
                pitch: is3DMode ? 60 : 0,
                heading: steps[currentStep]?.maneuver?.heading || 0,
                zoom: showParkingPreview ? 16 : 18,
            })
        }
    }

    useEffect(() => {
        if (currentLocation && !isNavigatingToParking && !showParkingPreview) {
            updateCamera(currentLocation)
        }
    }, [currentLocation, is3DMode, currentStep, isNavigatingToParking, showParkingPreview])

    const handleCancel = async () => {
        // Finalizar viaje como cancelado
        await finalizarViajeEnBD({
            estado: "cancelado",
            distancia_final: totalDistanceTraveled,
            ubicacion_final_lat: currentLocation.latitude,
            ubicacion_final_lng: currentLocation.longitude,
        })

        navigation.navigate("Home")
    }

    const handleDirectionsReady = (result) => {
        console.log("🗺️ Ruta calculada exitosamente")
        setRouteDetails(result)
        setSteps(result.legs[0].steps)
        setCurrentStep(0)
        setHasInitializedRoute(true)
        setIsRecalculating(false)

        // Extraer coordenadas de la ruta para verificación de desvío
        const coordinates = []
        result.legs.forEach((leg) => {
            leg.steps.forEach((step) => {
                if (step.polyline && step.polyline.points) {
                    // Decodificar polyline si es necesario
                    coordinates.push(step.start_location)
                    coordinates.push(step.end_location)
                }
            })
        })
        setRouteCoordinates(coordinates)

        // Anunciar inicio de navegación
        if (!isNavigatingToParking && !showParkingPreview) {
            announceNavigationStart()
            updateCamera(currentLocation)
        }
    }

    const handleDirectionsError = (errorMessage) => {
        console.error("❌ Error en direcciones:", errorMessage)
        setIsRecalculating(false)

        if (isVoiceEnabled) {
            speakInstruction("Error calculando ruta, reintentando")
        }

        // Reintentar después de un delay
        setTimeout(() => {
            if (!hasInitializedRoute) {
                console.log("🔄 Reintentando cálculo de ruta...")
                setHasInitializedRoute(false)
            }
        }, 3000)
    }

    const toggle3DMode = () => {
        setIs3DMode(!is3DMode)
        updateCamera(currentLocation)
    }

    const toggleNavigationCard = () => {
        setIsNavigationVisible(!isNavigationVisible)
    }

    // Función para buscar calles de estacionamiento cercanas
    const findNearbyParkingStreets = async (centerLocation, radius = 200) => {
        try {
            console.log("🔍 Buscando calles de estacionamiento cercanas...")

            // Obtener datos de estacionamiento de la API
            const response = await axios.get(`${Config.API_URL}/mapeado`, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            })

            if (!Array.isArray(response.data)) {
                throw new Error("Datos de estacionamiento no válidos")
            }

            // Filtrar solo estacionamientos permitidos (no prohibidos)
            const allowedParkingTypes = [
                "ESTACIONAMIENTO TARIFADO",
                "ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD",
                "ESTACIONAMIENTO DESCARGUE DE MERCADERÍA",
                "ESTACIONAMIENTO VEHÍCULOS OFICIALES",
                "ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS",
            ]

            const parkingLines = response.data.filter(
                (item) =>
                    item.type === "polyline" &&
                    item.latlngs &&
                    Array.isArray(item.latlngs) &&
                    item.latlngs.length > 1 &&
                    allowedParkingTypes.includes(item.restriction),
            )

            console.log(`📊 Encontradas ${parkingLines.length} líneas de estacionamiento permitido`)

            // Calcular distancias y encontrar las más cercanas
            const parkingWithDistances = parkingLines.map((line, index) => {
                // Calcular el punto medio de la línea
                const midIndex = Math.floor(line.latlngs.length / 2)
                const midPoint = line.latlngs[midIndex]

                // Calcular distancia desde el centro
                const distance = calculateDistance(centerLocation.latitude, centerLocation.longitude, midPoint[0], midPoint[1])

                return {
                    ...line,
                    id: line.id, // Use real database ID instead of fake generated ID
                    midPoint: { latitude: midPoint[0], longitude: midPoint[1] },
                    distance: distance,
                    streetName: `Calle ${line.restriction.replace("ESTACIONAMIENTO ", "")}`,
                    parkingType: line.restriction,
                }
            })

            const nearbyParking = parkingWithDistances.filter((parking) => parking.distance <= radius)

            console.log(`🎯 Encontradas ${nearbyParking.length} opciones dentro de ${radius}m`)

            return nearbyParking
        } catch (error) {
            console.error("❌ Error al buscar estacionamientos:", error)
            return []
        }
    }

    // Función mejorada para detectar llegada
    const checkArrival = (currentPos, destination, mode) => {
        try {
            if (!currentPos || !destination || hasArrived) {
                return false
            }

            // Validar que las coordenadas sean válidas
            if (!currentPos.latitude || !currentPos.longitude || !destination.latitude || !destination.longitude) {
                return false
            }

            const distance = calculateDistance(
                currentPos.latitude,
                currentPos.longitude,
                destination.latitude,
                destination.longitude,
            )

            console.log(`📏 Distancia al ${mode}:`, distance.toFixed(1), "metros")

            // Usar diferentes umbrales según el modo
            const threshold = mode === "parking" ? 30 : ARRIVAL_THRESHOLD

            if (distance <= threshold) {
                // Incrementar contador de llegadas consecutivas
                setConsecutiveArrivalChecks((prev) => prev + 1)

                // Solo considerar llegada después de 3 verificaciones consecutivas
                if (consecutiveArrivalChecks >= 2) {
                    console.log(`🎯 ¡Llegada confirmada al ${mode}!`)
                    return true
                }
            } else {
                // Resetear contador si no está cerca
                setConsecutiveArrivalChecks(0)
            }

            return false
        } catch (error) {
            console.error("Error verificando llegada:", error)
            return false
        }
    }

    // Función para mostrar el modal de llegada con animaciones
    const showArrivalNotification = () => {
        try {
            if (hasArrived) return // Evitar múltiples modales

            setHasArrived(true)
            setShowArrivalModal(true)

            // Secuencia de animaciones para el modal
            Animated.parallel([
                Animated.timing(modalFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(modalScaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start()

            // Animación del checkmark después de un delay
            setTimeout(() => {
                Animated.spring(checkmarkScale, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }).start()

                // Pulso continuo del checkmark
                const pulseAnimation = Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulseAnim, {
                            toValue: 1.1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseAnim, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                )
                pulseAnimation.start()
            }, 200)

            // Confetti animation
            setTimeout(() => {
                Animated.timing(confettiAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }).start()
            }, 400)
        } catch (error) {
            console.error("Error mostrando modal de llegada:", error)
        }
    }

    const closeArrivalModal = async () => {
        Animated.parallel([
            Animated.timing(modalFadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(modalScaleAnim, {
                toValue: 0.5,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowArrivalModal(false)
            // Reset animations
            modalFadeAnim.setValue(0)
            modalScaleAnim.setValue(0.5)
            checkmarkScale.setValue(0)
            confettiAnim.setValue(0)
            pulseAnim.setValue(1)

            // Solo navegar al Home, sin finalizar viaje automáticamente
            navigation.navigate("Home")
        })
    }

    // Función para mostrar la pregunta de estacionamiento
    const showParkingQuestion = () => {
        try {
            console.log("[v0] Mostrando modal de estacionamiento encontrado")
            setShowParkingModal(true)

            // Animaciones del modal
            Animated.parallel([
                Animated.timing(parkingModalFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(parkingModalScaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start()
        } catch (error) {
            console.error("Error mostrando modal de estacionamiento:", error)
        }
    }

    const searchParkingDirectly = async () => {
        try {
            console.log("[v0] Iniciando búsqueda de estacionamiento...")
            setIsSearchingParking(true)
            setShowArrivalModal(false)

            if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
                console.error("[v0] Ubicación actual no válida")
                setIsSearchingParking(false)
                return
            }

            // Registrar búsqueda en BD de manera no bloqueante
            console.log("[v0] Registrando búsqueda en BD...")
            iniciarBusquedaEstacionamientoEnBD(currentLocation).catch((error) => {
                console.error("[v0] Error en BD (no crítico):", error)
            })

            console.log("[v0] Buscando estacionamientos cercanos...")
            const nearbyParking = await findNearbyParkingStreets(currentLocation, 200)

            if (nearbyParking && nearbyParking.length > 0) {
                console.log("[v0] Estacionamientos encontrados:", nearbyParking.length)

                const validParking = nearbyParking.filter(
                    (parking) =>
                        parking &&
                        parking.id &&
                        parking.midPoint &&
                        parking.midPoint.latitude &&
                        parking.midPoint.longitude &&
                        parking.latlngs &&
                        Array.isArray(parking.latlngs) &&
                        parking.latlngs.length > 0,
                )

                if (validParking.length === 0) {
                    console.error("[v0] No hay estacionamientos válidos")
                    setIsSearchingParking(false)
                    Alert.alert("Error", "Los datos de estacionamiento no son válidos. Intenta nuevamente.")
                    return
                }

                console.log("[v0] Estacionamientos válidos:", validParking.length)

                setAllNearbyParking(validParking)
                const topParking = validParking.slice(0, 5)
                setParkingOptions(topParking)
                setCurrentParkingIndex(0)

                setSelectedParkingSpot(null)
                setIsNavigatingToParking(false)
                setHasInitializedRoute(false)

                setTimeout(() => {
                    setNavigationMode("preview")
                    setShowParkingPreview(true)
                    setShowParkingRadius(true)
                    setIsSearchingParking(false)

                    // Animar la barra superior
                    Animated.timing(previewSlideAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }).start()

                    console.log("[v0] Vista de estacionamientos configurada correctamente")
                }, 100)
            } else {
                console.log("[v0] No se encontraron estacionamientos")
                setIsSearchingParking(false)
                Alert.alert(
                    "Sin estacionamientos",
                    "No se encontraron estacionamientos disponibles en un radio de 200m. ¿Deseas finalizar el viaje?",
                    [
                        { text: "Reintentar", onPress: () => searchParkingDirectly() },
                        { text: "Finalizar viaje", onPress: () => finalizarViaje() },
                    ],
                )
            }
        } catch (error) {
            console.error("[v0] Error en búsqueda de estacionamiento:", error)
            setIsSearchingParking(false)
            Alert.alert("Error", "Hubo un problema al buscar estacionamientos. ¿Deseas reintentar?", [
                { text: "Reintentar", onPress: () => searchParkingDirectly() },
                { text: "Finalizar viaje", onPress: () => finalizarViaje() },
            ])
        }
    }

    const handleParkingResponse = async (foundParking) => {
        try {
            console.log("[v0] Respuesta de estacionamiento:", foundParking ? "Encontrado" : "No encontrado")

            // Validar datos necesarios antes de proceder
            if (!currentLocation) {
                console.error("[v0] Error: currentLocation no disponible")
                Alert.alert("Error", "No se pudo obtener la ubicación actual")
                return
            }

            if (foundParking) {
                let nombreCalle = "Calle no identificada"
                const endCoords = getEndCoordsForStreetName(selectedParkingSpot, currentLocation)
                if (endCoords) {
                    console.log("[v0] Obteniendo nombre de calle para coordenadas:", endCoords.lat, endCoords.lng)
                    nombreCalle = await obtenerNombreCalle(endCoords.lat, endCoords.lng)
                    console.log("[v0] Nombre de calle obtenido:", nombreCalle)
                }

                // Usuario encontró estacionamiento, finalizar viaje con datos completos
                const datosFinalizacion = {
                    estado: "completado",
                    distancia_final: totalDistanceTraveled || 0,
                    encontro_lugar_busqueda: true,
                    ubicacion_final_lat: endCoords?.lat || currentLocation.latitude,
                    ubicacion_final_lng: endCoords?.lng || currentLocation.longitude,
                    id_mapeado: selectedParkingSpot?.id || null,
                    calle_estacionamiento: nombreCalle,
                }

                console.log("[v0] Finalizando viaje con estacionamiento encontrado")
                await finalizarViajeEnBD(datosFinalizacion)

                closeParkingModal()
                navigation.navigate("Home")
            } else {
                // No encontró, buscar siguiente estacionamiento o mostrar opciones
                closeParkingModal()

                // Volver al modo de búsqueda para mostrar más opciones
                setNavigationMode("preview")
                setHasArrived(false)
                setConsecutiveArrivalChecks(0)

                // Mostrar mensaje de búsqueda de alternativas
                Alert.alert("Buscar Alternativa", "¿Quieres buscar otro estacionamiento cercano?", [
                    {
                        text: "Finalizar Viaje",
                        onPress: async () => {
                            let nombreCalle = "Calle no identificada"
                            const endCoords = getEndCoordsForStreetName(selectedParkingSpot, currentLocation)
                            if (endCoords) {
                                console.log("[v0] Obteniendo nombre de calle para finalización sin encontrar")
                                nombreCalle = await obtenerNombreCalle(endCoords.lat, endCoords.lng)
                                console.log("[v0] Nombre de calle para finalización:", nombreCalle)
                            }

                            const datosFinalizacion = {
                                estado: "completado",
                                distancia_final: totalDistanceTraveled || 0,
                                encontro_lugar_busqueda: false,
                                ubicacion_final_lat: endCoords?.lat || currentLocation.latitude,
                                ubicacion_final_lng: endCoords?.lng || currentLocation.longitude,
                                id_mapeado: selectedParkingSpot?.id || null,
                                calle_estacionamiento: nombreCalle,
                            }

                            console.log("[v0] Finalizando viaje sin encontrar estacionamiento")
                            await finalizarViajeEnBD(datosFinalizacion)
                            navigation.navigate("Home")
                        },
                    },
                    {
                        text: "Buscar Otro",
                        onPress: () => {
                            // Mantener en modo preview para seleccionar otro estacionamiento
                            console.log("[v0] Usuario quiere buscar otro estacionamiento")
                        },
                    },
                ])
            }
        } catch (error) {
            console.error("Error manejando respuesta de estacionamiento:", error)
            Alert.alert("Error", "Hubo un problema. Intenta finalizar el viaje manualmente.")
        }
    }

    const closeParkingModal = () => {
        try {
            Animated.parallel([
                Animated.timing(parkingModalFadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(parkingModalScaleAnim, {
                    toValue: 0.8,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setShowParkingModal(false)
                setHasArrived(false) // Reset para permitir nueva detección
                setConsecutiveArrivalChecks(0)
            })
        } catch (error) {
            console.error("Error cerrando modal de estacionamiento:", error)
        }
    }

    // Función para abrir el modal de opciones desde la vista previa
    const openParkingOptionsFromPreview = () => {
        setShowParkingOptionsModal(true)
    }

    // Función para iniciar navegación automática al estacionamiento
    const startAutomaticNavigation = () => {
        if (parkingOptions.length > 0) {
            const firstParking = parkingOptions[0]
            setSelectedParkingSpot(firstParking)
            setIsNavigatingToParking(true)
            setNavigationMode("parking")
            setHasArrived(false) // Reset para nueva navegación
            setConsecutiveArrivalChecks(0)
            announceNavigationMode("parking")
            setShowParkingPreview(false)
            setShowParkingOptionsModal(false)
            setHasInitializedRoute(false)

            // Ocultar barra superior
            Animated.timing(previewSlideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }).start()

            // Centrar mapa en el estacionamiento
            if (mapRef.current) {
                mapRef.current.animateToRegion(
                    {
                        latitude: firstParking.midPoint.latitude,
                        longitude: firstParking.midPoint.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    },
                    1000,
                )
            }
        }
    }

    const selectParkingSpot = (spot) => {
        try {
            console.log("[v0] Estacionamiento seleccionado:", spot.streetName)
            setSelectedParkingSpot(spot)
            setNavigationMode("parking")
            setHasArrived(false)
            setConsecutiveArrivalChecks(0)
        } catch (error) {
            console.error("Error seleccionando estacionamiento:", error)
        }
    }

    // Función para seleccionar estacionamiento manualmente
    const selectParkingManually = (parking) => {
        setSelectedParkingSpot(parking)
        setIsNavigatingToParking(true)
        setNavigationMode("parking")
        setHasArrived(false) // Reset para nueva navegación
        setConsecutiveArrivalChecks(0)
        announceNavigationMode("parking")
        setShowParkingPreview(false)
        setShowParkingOptionsModal(false)
        setHasInitializedRoute(false)

        // Ocultar barra superior
        Animated.timing(previewSlideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start()

        // Centrar mapa en el estacionamiento seleccionado
        if (mapRef.current) {
            mapRef.current.animateToRegion(
                {
                    latitude: parking.midPoint.latitude,
                    longitude: parking.midPoint.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                },
                1000,
            )
        }
    }

    // Función para ir al siguiente estacionamiento (navegación automática)
    const goToNextParking = () => {
        if (currentParkingIndex < parkingOptions.length - 1) {
            const nextIndex = currentParkingIndex + 1
            setCurrentParkingIndex(nextIndex)
            setSelectedParkingSpot(parkingOptions[nextIndex])
            setHasArrived(false) // Reset para nueva navegación
            setConsecutiveArrivalChecks(0)
            setHasInitializedRoute(false)

            // Centrar mapa en el siguiente estacionamiento
            if (mapRef.current) {
                mapRef.current.animateToRegion(
                    {
                        latitude: parkingOptions[nextIndex].midPoint.latitude,
                        longitude: parkingOptions[nextIndex].midPoint.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    },
                    1000,
                )
            }
        } else {
            // No hay más opciones, finalizar sin encontrar estacionamiento
            finalizarViajeEnBD({
                estado: "completado",
                distancia_final: totalDistanceTraveled,
                encontro_lugar_busqueda: false,
                ubicacion_final_lat: currentLocation.latitude,
                ubicacion_final_lng: currentLocation.longitude,
            })

            setIsNavigatingToParking(false)
            setSelectedParkingSpot(null)
            setNavigationMode("destination")
            setShowParkingRadius(false)
            navigation.navigate("Home")
        }
    }

    const confirmParkingFound = async () => {
        const endCoords = getEndCoordsForStreetName(selectedParkingSpot, currentLocation)
        let nombreCalle = selectedParkingSpot?.streetName || null
        if (!nombreCalle && endCoords) {
            console.log("[v0] Resolviendo nombre de calle para confirmParkingFound")
            nombreCalle = await obtenerNombreCalle(endCoords.lat, endCoords.lng)
        }

        await finalizarViajeEnBD({
            estado: "completado",
            distancia_final: totalDistanceTraveled,
            encontro_lugar_busqueda: true,
            ubicacion_final_lat: endCoords?.lat || currentLocation.latitude,
            ubicacion_final_lng: endCoords?.lng || currentLocation.longitude,
            id_mapeado: selectedParkingSpot?.id || null,
            calle_estacionamiento: nombreCalle || "Calle no identificada",
        })

        setIsNavigatingToParking(false)
        setSelectedParkingSpot(null)
        setNavigationMode("destination")
        setShowParkingRadius(false)
        setShowParkingPreview(false)

        // Ocultar barra superior
        Animated.timing(previewSlideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start()

        navigation.navigate("Home")
    }

    // Función para finalizar desde la vista previa
    const finalizeParkingPreview = async () => {
        await finalizarViajeEnBD({
            estado: "completado",
            distancia_final: totalDistanceTraveled,
            encontro_lugar_busqueda: false,
            ubicacion_final_lat: currentLocation.latitude,
            ubicacion_final_lng: currentLocation.longitude,
        })

        setShowParkingPreview(false)
        setNavigationMode("destination")
        setShowParkingRadius(false)
        setAllNearbyParking([])
        setParkingOptions([])

        // Ocultar barra superior
        Animated.timing(previewSlideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start()

        navigation.navigate("Home")
    }

    // Función para manejar llegada al estacionamiento
    const handleParkingArrival = () => {
        // Mostrar modal preguntando si encontró espacio
        showParkingQuestion()
    }

    // Función para finalizar navegación completamente
    const finishNavigation = async () => {
        await finalizarViajeEnBD({
            estado: "cancelado",
            distancia_final: totalDistanceTraveled,
            ubicacion_final_lat: currentLocation.latitude,
            ubicacion_final_lng: currentLocation.longitude,
        })

        navigation.navigate("Home")
    }

    // Lógica mejorada de navegación y detección de llegada
    useEffect(() => {
        try {
            if (steps.length > 0 && hasInitializedRoute && currentLocation) {
                // Determinar el destino actual según el modo de navegación
                const currentDestination =
                    navigationMode === "parking" && selectedParkingSpot ? selectedParkingSpot.midPoint : destinationLocation

                console.log("[v0] Verificando llegada - Modo:", navigationMode, "Destino:", currentDestination)

                // Verificar llegada con lógica mejorada
                const arrived = checkArrival(currentLocation, currentDestination, navigationMode)

                if (arrived && !hasArrived) {
                    console.log("[v0] ¡Llegada detectada! Modo:", navigationMode)
                    setHasArrived(true)

                    if (navigationMode === "parking" && selectedParkingSpot) {
                        // Llegó al estacionamiento seleccionado
                        console.log("[v0] Llegada al estacionamiento seleccionado:", selectedParkingSpot.streetName)
                        if (isVoiceEnabled) {
                            speakInstruction("Has llegado al área de estacionamiento")
                        }
                        handleParkingArrival()
                    } else if (navigationMode === "destination") {
                        // Llegó al destino original
                        if (isVoiceEnabled) {
                            speakInstruction("Has llegado a tu destino")
                        }
                        showArrivalNotification()
                    }
                }

                // Actualizar paso actual basado en la distancia
                if (steps[currentStep]) {
                    const stepEndLocation = steps[currentStep].end_location
                    if (stepEndLocation) {
                        const distanceToStepEnd = calculateDistance(
                            currentLocation.latitude,
                            currentLocation.longitude,
                            stepEndLocation.lat,
                            stepEndLocation.lng,
                        )

                        // Avanzar al siguiente paso si está cerca del final del paso actual
                        if (distanceToStepEnd < 25 && currentStep < steps.length - 1) {
                            setCurrentStep((prevStep) => prevStep + 1)

                            // Hablar la nueva instrucción
                            if (steps[currentStep + 1] && isVoiceEnabled) {
                                const nextInstruction = steps[currentStep + 1].html_instructions
                                speakInstruction(nextInstruction)
                            }
                        }
                    }
                }

                // Hablar instrucciones de proximidad
                if (steps[currentStep + 1] && isVoiceEnabled) {
                    const nextStepLocation = steps[currentStep + 1].start_location
                    if (nextStepLocation) {
                        const distanceToNextStep = calculateDistance(
                            currentLocation.latitude,
                            currentLocation.longitude,
                            nextStepLocation.lat,
                            nextStepLocation.lng,
                        )

                        if (distanceToNextStep < 100 && distanceToNextStep > 80) {
                            const nextInstruction = steps[currentStep + 1].html_instructions
                            speakInstruction(`En 100 metros, ${nextInstruction}`)
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error en lógica de navegación:", error)
        }
    }, [
        currentLocation,
        steps,
        currentStep,
        navigationMode,
        hasInitializedRoute,
        isVoiceEnabled,
        selectedParkingSpot,
        hasArrived,
    ])

    const getDirectionIcon = (maneuver) => {
        if (!maneuver) return "navigation"
        if (maneuver.includes("left")) return "turn-left"
        if (maneuver.includes("right")) return "turn-right"
        if (maneuver.includes("straight")) return "straight"
        return "navigation"
    }

    // Función para obtener la dirección del destino
    const getDestinationAddress = () => {
        if (destinationLocation.address) {
            return destinationLocation.address
        }
        return `${destinationLocation.latitude.toFixed(4)}, ${destinationLocation.longitude.toFixed(4)}`
    }

    // Función para obtener el color del tipo de estacionamiento
    const getParkingColor = (parkingType) => {
        switch (parkingType) {
            case "ESTACIONAMIENTO TARIFADO":
                return "#3498DB"
            case "ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD":
                return "#27AE60"
            case "ESTACIONAMIENTO DESCARGUE DE MERCADERÍA":
                return "#F39C12"
            case "ESTACIONAMIENTO VEHÍCULOS OFICIALES":
                return "#8E44AD"
            case "ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS":
                return "#1ABC9C"
            default:
                return "#7F8C8D"
        }
    }

    // Función para obtener el icono del tipo de estacionamiento
    const getParkingIcon = (parkingType) => {
        switch (parkingType) {
            case "ESTACIONAMIENTO TARIFADO":
                return "local-parking"
            case "ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD":
                return "accessible"
            case "ESTACIONAMIENTO DESCARGUE DE MERCADERÍA":
                return "local-shipping"
            case "ESTACIONAMIENTO VEHÍCULOS OFICIALES":
                return "star"
            case "ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS":
                return "flash-on"
            default:
                return "local-parking"
        }
    }

    // Función para obtener la distancia total de estacionamientos
    const getTotalParkingDistance = () => {
        if (allNearbyParking.length === 0) return "0"
        const minDistance = Math.min(...allNearbyParking.map((p) => p.distance))
        return (minDistance / 1000).toFixed(1)
    }

    // Función para anunciar el inicio de navegación
    const announceNavigationStart = () => {
        if (isVoiceEnabled) {
            let destination = getDestinationAddress()
            destination = expandAbbreviations(destination)
            speakInstruction(`Iniciando navegación hacia ${destination}`)
        }
    }

    // Función para anunciar cambios de modo
    const announceNavigationMode = (mode) => {
        if (isVoiceEnabled) {
            switch (mode) {
                case "parking":
                    speakInstruction("Cambiando a navegación de estacionamiento")
                    break
                case "preview":
                    speakInstruction("Mostrando opciones de estacionamiento cercanas")
                    break
                default:
                    break
            }
        }
    }

    // Función para finalizar viaje
    const finalizarViaje = async (foundParking) => {
        try {
            if (!currentLocation) {
                console.error("[v0] Error: currentLocation no disponible")
                Alert.alert("Error", "No se pudo obtener la ubicación actual")
                return
            }

            if (foundParking) {
                let nombreCalle = "Calle no identificada"
                if (selectedParkingSpot?.midPoint?.latitude && selectedParkingSpot?.midPoint?.longitude) {
                    console.log(
                        "[v0] Obteniendo nombre de calle para coordenadas:",
                        selectedParkingSpot.midPoint.latitude,
                        selectedParkingSpot.midPoint.longitude,
                    )
                    nombreCalle = await obtenerNombreCalle(
                        selectedParkingSpot.midPoint.latitude,
                        selectedParkingSpot.midPoint.longitude,
                    )
                    console.log("[v0] Nombre de calle obtenido:", nombreCalle)
                }

                // Usuario encontró estacionamiento, finalizar viaje con datos completos
                const datosFinalizacion = {
                    estado: "completado",
                    distancia_final: totalDistanceTraveled || 0,
                    encontro_lugar_busqueda: true,
                    ubicacion_final_lat: currentLocation.latitude,
                    ubicacion_final_lng: currentLocation.longitude,
                    id_mapeado: selectedParkingSpot?.id || null,
                    calle_estacionamiento: nombreCalle,
                }

                console.log("[v0] Finalizando viaje con estacionamiento encontrado")
                await finalizarViajeEnBD(datosFinalizacion)

                closeParkingModal()
                navigation.navigate("Home")
            } else {
                // No encontró, buscar siguiente estacionamiento o mostrar opciones
                closeParkingModal()

                // Volver al modo de búsqueda para mostrar más opciones
                setNavigationMode("preview")
                setHasArrived(false)
                setConsecutiveArrivalChecks(0)

                // Mostrar mensaje de búsqueda de alternativas
                Alert.alert("Buscar Alternativa", "¿Quieres buscar otro estacionamiento cercano?", [
                    {
                        text: "Finalizar Viaje",
                        onPress: async () => {
                            let nombreCalle = "Calle no identificada"
                            if (selectedParkingSpot?.midPoint?.latitude && selectedParkingSpot?.midPoint?.longitude) {
                                console.log("[v0] Obteniendo nombre de calle para finalización sin encontrar")
                                nombreCalle = await obtenerNombreCalle(
                                    selectedParkingSpot.midPoint.latitude,
                                    selectedParkingSpot.midPoint.longitude,
                                )
                                console.log("[v0] Nombre de calle para finalización:", nombreCalle)
                            }

                            const datosFinalizacion = {
                                estado: "completado",
                                distancia_final: totalDistanceTraveled || 0,
                                encontro_lugar_busqueda: false,
                                ubicacion_final_lat: currentLocation.latitude,
                                ubicacion_final_lng: currentLocation.longitude,
                                id_mapeado: selectedParkingSpot?.id || null,
                                calle_estacionamiento: nombreCalle,
                            }

                            console.log("[v0] Finalizando viaje sin encontrar estacionamiento")
                            await finalizarViajeEnBD(datosFinalizacion)
                            navigation.navigate("Home")
                        },
                    },
                    {
                        text: "Buscar Otro",
                        onPress: () => {
                            // Mantener en modo preview para seleccionar otro estacionamiento
                            console.log("[v0] Usuario quiere buscar otro estacionamiento")
                        },
                    },
                ])
            }
        } catch (error) {
            console.error("Error manejando respuesta de estacionamiento:", error)
            Alert.alert("Error", "Hubo un problema. Intenta finalizar el viaje manualmente.")
        }
    }

    const finishTripFromModal = async () => {
        // Finalizar viaje como completado sin búsqueda de estacionamiento
        await finalizarViajeEnBD({
            estado: "completado",
            distancia_final: totalDistanceTraveled,
            encontro_lugar_busqueda: null, // No hubo búsqueda
            ubicacion_final_lat: currentLocation.latitude,
            ubicacion_final_lng: currentLocation.longitude,
        })

        closeArrivalModal()
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Mapa principal */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                followsUserLocation={!isNavigatingToParking && !showParkingPreview}
                pitchEnabled={true}
                rotateEnabled={true}
                showsCompass={false}
                showsMyLocationButton={false}
                toolbarEnabled={false}
            >
                <Marker coordinate={currentLocation} title="Ubicación Actual" />

                {/* Marcador del destino original */}
                {navigationMode === "destination" && destinationLocation && (
                    <Marker coordinate={destinationLocation} title="Destino" />
                )}

                {/* Radio de búsqueda de estacionamientos */}
                {showParkingRadius && currentLocation && (
                    <Circle
                        center={currentLocation}
                        radius={200}
                        strokeColor="rgba(255, 107, 53, 0.5)"
                        fillColor="rgba(255, 107, 53, 0.1)"
                        strokeWidth={2}
                    />
                )}

                {allNearbyParking &&
                    allNearbyParking.length > 0 &&
                    allNearbyParking.map((parking, index) => {
                        // Validar que el estacionamiento tenga datos válidos
                        if (!parking || !parking.id || !parking.midPoint || !parking.latlngs || !Array.isArray(parking.latlngs)) {
                            console.warn(`[v0] Estacionamiento inválido en índice ${index}:`, parking)
                            return null
                        }

                        try {
                            return (
                                <View key={`parking-${parking.id}`}>
                                    <Polyline
                                        coordinates={parking.latlngs.map((coord) => ({
                                            latitude: coord[0],
                                            longitude: coord[1],
                                        }))}
                                        strokeColor={getParkingColor(parking.parkingType)}
                                        strokeWidth={selectedParkingSpot?.id === parking.id ? 6 : 3}
                                        lineCap="round"
                                        lineJoin="round"
                                    />
                                    <Marker
                                        coordinate={parking.midPoint}
                                        title={`Estacionamiento ${index + 1}`}
                                        description={
                                            parking.parkingType ? parking.parkingType.replace("ESTACIONAMIENTO ", "") : "Estacionamiento"
                                        }
                                        onPress={() => selectParkingManually(parking)}
                                    >
                                        <View
                                            style={[
                                                styles.customMarker,
                                                { backgroundColor: getParkingColor(parking.parkingType) },
                                                selectedParkingSpot?.id === parking.id && styles.selectedMarker,
                                            ]}
                                        >
                                            <Icon name={getParkingIcon(parking.parkingType)} size={wp(4)} color="#FFFFFF" />
                                        </View>
                                    </Marker>
                                </View>
                            )
                        } catch (renderError) {
                            console.error(`[v0] Error renderizando estacionamiento ${index}:`, renderError)
                            return null
                        }
                    })}

                {/* Ruta principal al destino */}
                {navigationMode === "destination" && destinationLocation && (
                    <MapViewDirections
                        origin={currentLocation}
                        destination={destinationLocation}
                        apikey={Config.GOOGLE_MAPS_APIKEY}
                        language="es"
                        strokeWidth={6}
                        strokeColor="#FF6B35"
                        optimizeWaypoints={true}
                        onReady={handleDirectionsReady}
                        onError={handleDirectionsError}
                        resetOnChange={true}
                        precision="high"
                    />
                )}

                {/* Ruta al estacionamiento seleccionado */}
                {navigationMode === "parking" && selectedParkingSpot && selectedParkingSpot.midPoint && (
                    <MapViewDirections
                        origin={currentLocation}
                        destination={selectedParkingSpot.midPoint}
                        apikey={Config.GOOGLE_MAPS_APIKEY}
                        language="es"
                        strokeWidth={6}
                        strokeColor="#9B59B6"
                        optimizeWaypoints={true}
                        onReady={handleDirectionsReady}
                        onError={handleDirectionsError}
                        resetOnChange={true}
                        precision="high"
                    />
                )}
            </MapView>

            {/* Indicador de recálculo */}
            {/* {isRecalculating && (
                <View style={styles.recalculatingIndicator}>
                    <Icon name="refresh" size={wp(4)} color="#FFFFFF" />
                    <Text style={styles.recalculatingText}>Recalculando ruta...</Text>
                </View>
            )} */}

            {/* Indicador de fuera de ruta */}
            {/* {isOffRoute && !isRecalculating && (
                <View style={styles.offRouteIndicator}>
                    <Icon name="warning" size={wp(4)} color="#FFFFFF" />
                    <Text style={styles.offRouteText}>Fuera de ruta</Text>
                </View>
            )} */}

            {/* Barra superior de estacionamiento (Vista previa) */}
            {showParkingPreview && (
                <Animated.View
                    style={[
                        styles.parkingTopBar,
                        {
                            transform: [{ translateY: previewSlideAnim }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.parkingTopBarContent}
                        onPress={openParkingOptionsFromPreview}
                        activeOpacity={0.8}
                    >
                        <View style={styles.parkingTopBarIcon}>
                            <Icon name="local-parking" size={wp(6)} color="#FFFFFF" />
                        </View>
                        <View style={styles.parkingTopBarText}>
                            <Text style={styles.parkingTopBarTitle}>Estacionamiento</Text>
                            <Text style={styles.parkingTopBarDistance}>{getTotalParkingDistance()} km</Text>
                        </View>
                        <Icon name="keyboard-arrow-down" size={wp(6)} color="#FFFFFF" />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Header compacto */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => navigation.navigate("MenuScreen")}
                    activeOpacity={0.8}
                >
                    <Icon name="menu" size={wp(5)} color="#FFFFFF" />
                </TouchableOpacity>

                <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                    <Image source={require("../../assets/DRIVESMART.png")} style={styles.logo} />
                </Animated.View>

                {/* Botón de finalizar en el header */}
                <TouchableOpacity style={styles.finishHeaderButton} onPress={finishNavigation} activeOpacity={0.8}>
                    <Icon name="close" size={wp(5)} color="#FFFFFF" />
                </TouchableOpacity>
            </Animated.View>

            {/* Controles flotantes del lado derecho */}
            <Animated.View
                style={[
                    styles.rightControls,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <TouchableOpacity style={styles.controlButton} onPress={toggle3DMode} activeOpacity={0.8}>
                    <Icon name={is3DMode ? "3d-rotation" : "map"} size={wp(5)} color="#FF6B35" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={toggleNavigationCard} activeOpacity={0.8}>
                    <Icon name={isNavigationVisible ? "keyboard-arrow-down" : "keyboard-arrow-up"} size={wp(5)} color="#FF6B35" />
                </TouchableOpacity>

                {/* Botón para mostrar opciones de estacionamiento */}
                {(allNearbyParking.length > 0 || showParkingPreview) && (
                    <TouchableOpacity
                        style={[styles.controlButton, styles.parkingButton]}
                        onPress={openParkingOptionsFromPreview}
                        activeOpacity={0.8}
                    >
                        <Icon name="local-parking" size={wp(5)} color="#9B59B6" />
                    </TouchableOpacity>
                )}

                {/* Botón de asistente de voz */}
                <Animated.View style={{ transform: [{ scale: voiceButtonScale }] }}>
                    <TouchableOpacity
                        style={[styles.controlButton, styles.voiceButton, isVoiceEnabled && styles.voiceButtonActive]}
                        onPress={toggleVoiceAssistant}
                        activeOpacity={0.8}
                    >
                        <Animated.View style={{ transform: [{ scale: isSpeaking ? voicePulseAnim : 1 }] }}>
                            <Icon
                                name={isVoiceEnabled ? "volume-up" : "volume-off"}
                                size={wp(5)}
                                color={isVoiceEnabled ? "#FFFFFF" : "#FF6B35"}
                            />
                        </Animated.View>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Información de ruta compacta en la parte superior */}
            {routeDetails && !showParkingPreview && (
                <Animated.View
                    style={[
                        styles.routeInfoTop,
                        {
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <View style={[styles.routeStats, navigationMode === "parking" && styles.parkingRouteStats]}>
                        <View style={styles.statItem}>
                            <Icon name={navigationMode === "parking" ? "local-parking" : "schedule"} size={wp(4)} color="#FFFFFF" />
                            <Text style={styles.statText}>
                                {navigationMode === "parking" ? "Estacionamiento" : `${Math.floor(routeDetails.duration)} min`}
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Icon name="straighten" size={wp(4)} color="#FFFFFF" />
                            <Text style={styles.statText}>{totalDistanceTraveled.toFixed(1)} km</Text>
                        </View>
                    </View>
                </Animated.View>
            )}

            {/* Tarjeta de navegación compacta */}
            {isNavigationVisible && !showParkingPreview && (
                <Animated.View
                    style={[
                        styles.navigationCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideUpAnim }],
                        },
                    ]}
                >
                    {steps.length > 0 && steps[currentStep] && (
                        <View style={styles.navigationContent}>
                            {/* Indicador de modo de navegación */}
                            {navigationMode === "parking" && (
                                <View style={styles.navigationModeIndicator}>
                                    <Icon name="local-parking" size={wp(4)} color="#9B59B6" />
                                    <Text style={styles.navigationModeText}>Navegando al estacionamiento</Text>
                                </View>
                            )}

                            {/* Instrucción actual */}
                            <View style={styles.currentDirection}>
                                <View style={styles.directionIconContainer}>
                                    <Icon name={getDirectionIcon(steps[currentStep]?.maneuver)} size={wp(6)} color="#FF6B35" />
                                </View>
                                <Text style={styles.directionText} numberOfLines={2}>
                                    {steps[currentStep]?.html_instructions.replace(/<\/?[^>]+(>|$)/g, "")}
                                </Text>
                            </View>

                            {/* Próxima instrucción */}
                            {steps[currentStep + 1] && (
                                <View style={styles.nextDirection}>
                                    <Text style={styles.thenText}>Luego:</Text>
                                    <Icon name={getDirectionIcon(steps[currentStep + 1]?.maneuver)} size={wp(4)} color="#7F8C8D" />
                                    <Text style={styles.nextDirectionText} numberOfLines={1}>
                                        {steps[currentStep + 1]?.html_instructions.replace(/<\/?[^>]+(>|$)/g, "")}
                                    </Text>
                                </View>
                            )}

                            {/* Botón de cancelar */}
                            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
                                <Icon name="close" size={wp(4)} color="#FFFFFF" />
                                <Text style={styles.cancelButtonText}>Finalizar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            )}

            {/* Tarjeta de navegación para vista previa */}
            {showParkingPreview && isNavigationVisible && (
                <Animated.View
                    style={[
                        styles.previewNavigationCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideUpAnim }],
                        },
                    ]}
                >
                    <View style={styles.previewNavigationContent}>
                        <View style={styles.previewNavigationHeader}>
                            <Icon name="local-parking" size={wp(5)} color="#9B59B6" />
                            <Text style={styles.previewNavigationTitle}>
                                {allNearbyParking.length > 0 ? "Opciones de Estacionamiento" : "Búsqueda de Estacionamiento"}
                            </Text>
                        </View>

                        <View style={styles.previewNavigationInfo}>
                            <Icon name={allNearbyParking.length > 0 ? "navigation" : "info"} size={wp(6)} color="#FF6B35" />
                            <Text style={styles.previewNavigationText}>
                                {allNearbyParking.length > 0
                                    ? "Selecciona un estacionamiento en el mapa o usa navegación automática"
                                    : "No se encontraron estacionamientos en un radio de 200 metros. Puedes intentar buscar en otra área o finalizar el viaje."}
                            </Text>
                        </View>

                        <View style={styles.previewNavigationButtons}>
                            {allNearbyParking.length > 0 ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.previewAutoButton}
                                        onPress={startAutomaticNavigation}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="navigation" size={wp(4)} color="#FFFFFF" />
                                        <Text style={styles.previewAutoButtonText}>Automático</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.previewFinishButton}
                                        onPress={finalizeParkingPreview}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="close" size={wp(4)} color="#FFFFFF" />
                                        <Text style={styles.previewFinishButtonText}>Finalizar</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.previewAutoButton}
                                        onPress={() => searchParkingDirectly()}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="refresh" size={wp(4)} color="#FFFFFF" />
                                        <Text style={styles.previewAutoButtonText}>Buscar Otra Vez</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.previewFinishButton}
                                        onPress={finalizeParkingPreview}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="close" size={wp(4)} color="#FFFFFF" />
                                        <Text style={styles.previewFinishButtonText}>Finalizar Viaje</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Animated.View>
            )}

            {/* Modal de llegada mejorado */}
            <Modal visible={showArrivalModal} transparent={true} animationType="none">
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.arrivalModal,
                            {
                                opacity: modalFadeAnim,
                                transform: [{ scale: modalScaleAnim }],
                            },
                        ]}
                    >
                        {/* Confetti particles */}
                        <Animated.View
                            style={[
                                styles.confettiContainer,
                                {
                                    opacity: confettiAnim,
                                },
                            ]}
                        >
                            {[...Array(8)].map((_, index) => (
                                <Animated.View
                                    key={index}
                                    style={[
                                        styles.confettiParticle,
                                        {
                                            backgroundColor: ["#FF6B35", "#E74C3C", "#F39C12", "#27AE60", "#3498DB"][index % 5],
                                            transform: [
                                                {
                                                    translateY: confettiAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [-50, 100],
                                                    }),
                                                },
                                                {
                                                    rotate: confettiAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: ["0deg", "360deg"],
                                                    }),
                                                },
                                            ],
                                            left: `${10 + index * 10}%`,
                                        },
                                    ]}
                                />
                            ))}
                        </Animated.View>

                        {/* Checkmark animado */}
                        <Animated.View
                            style={[
                                styles.checkmarkContainer,
                                {
                                    transform: [{ scale: Animated.multiply(checkmarkScale, pulseAnim) }],
                                },
                            ]}
                        >
                            <Icon name="check" size={wp(15)} color="#FFFFFF" />
                        </Animated.View>

                        {/* Contenido del modal */}
                        <View style={styles.modalContent}>
                            <Text style={styles.arrivalTitle}>🎉 ¡Has Llegado!</Text>
                            <Text style={styles.arrivalSubtitle}>Destino alcanzado exitosamente</Text>

                            <View style={styles.destinationInfo}>
                                <Icon name="place" size={wp(5)} color="#FF6B35" />
                                <Text style={styles.destinationText} numberOfLines={2}>
                                    {getDestinationAddress()}
                                </Text>
                            </View>

                            {/* Estadísticas del viaje */}
                            {routeDetails && (
                                <View style={styles.tripStats}>
                                    <View style={styles.statCard}>
                                        <Icon name="schedule" size={wp(5)} color="#3498DB" />
                                        <Text style={styles.statLabel}>Tiempo</Text>
                                        <Text style={styles.statValue}>{Math.floor(routeDetails.duration)} min</Text>
                                    </View>
                                    <View style={styles.statCard}>
                                        <Icon name="straighten" size={wp(5)} color="#27AE60" />
                                        <Text style={styles.statLabel}>Distancia</Text>
                                        <Text style={styles.statValue}>{totalDistanceTraveled.toFixed(1)} km</Text>
                                    </View>
                                </View>
                            )}

                            {/* Botones de acción */}
                            <View style={styles.arrivalButtons}>
                                <TouchableOpacity
                                    style={styles.searchParkingButton}
                                    onPress={searchParkingDirectly}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="local-parking" size={wp(4)} color="#FFFFFF" />
                                    <Text style={styles.searchParkingButtonText}>Buscar Estacionamiento</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.finishTripButton} onPress={finishTripFromModal} activeOpacity={0.8}>
                                    <Icon name="home" size={wp(4)} color="#FFFFFF" />
                                    <Text style={styles.finishTripButtonText}>Finalizar Viaje</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Mensaje adicional */}
                            <Text style={styles.thankYouText}>¡Gracias por usar DriveSmart!</Text>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Modal de pregunta de estacionamiento (solo cuando llega al parking) */}
            <Modal visible={showParkingModal} transparent={true} animationType="none">
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.parkingModal,
                            {
                                opacity: parkingModalFadeAnim,
                                transform: [{ scale: parkingModalScaleAnim }],
                            },
                        ]}
                    >
                        <View style={styles.questionContent}>
                            <Icon name="local-parking" size={wp(12)} color="#FF6B35" />
                            <Text style={styles.questionTitle}>🅿️ ¿Encontraste Estacionamiento?</Text>
                            <Text style={styles.questionSubtitle}>¿Pudiste encontrar un lugar para aparcar en esta área?</Text>

                            <View style={styles.questionButtons}>
                                <TouchableOpacity
                                    style={styles.yesButton}
                                    onPress={() => handleParkingResponse(true)}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="check-circle" size={wp(5)} color="#FFFFFF" />
                                    <Text style={styles.yesButtonText}>Sí, encontré</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.noButton}
                                    onPress={() => handleParkingResponse(false)}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="search" size={wp(5)} color="#FFFFFF" />
                                    <Text style={styles.noButtonText}>Buscar otro</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Modal de opciones de estacionamiento */}
            <Modal visible={showParkingOptionsModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.parkingOptionsModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalHeaderTitle}>🅿️ Opciones de Estacionamiento</Text>
                            <TouchableOpacity
                                style={styles.closeModalButton}
                                onPress={() => setShowParkingOptionsModal(false)}
                                activeOpacity={0.8}
                            >
                                <Icon name="close" size={wp(6)} color="#7F8C8D" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            {allNearbyParking.length > 0
                                ? `Encontramos ${allNearbyParking.length} opciones dentro de 200m`
                                : "No se encontraron estacionamientos en el área"}
                        </Text>

                        {allNearbyParking.length > 0 ? (
                            <>
                                {/* Botones de navegación */}
                                <View style={styles.navigationModeButtons}>
                                    <TouchableOpacity
                                        style={styles.automaticButton}
                                        onPress={startAutomaticNavigation}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="navigation" size={wp(5)} color="#FFFFFF" />
                                        <Text style={styles.automaticButtonText}>Navegación Automática</Text>
                                        <Text style={styles.automaticButtonSubtext}>Ruta más óptima</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Lista de estacionamientos */}
                                <ScrollView style={styles.parkingList} showsVerticalScrollIndicator={false}>
                                    {allNearbyParking.map((parking, index) => (
                                        <TouchableOpacity
                                            key={parking.id}
                                            style={[
                                                styles.parkingOptionItem,
                                                selectedParkingSpot?.id === parking.id && styles.selectedParkingItem,
                                            ]}
                                            onPress={() => selectParkingManually(parking)}
                                            activeOpacity={0.7}
                                        >
                                            <View
                                                style={[styles.parkingOptionIcon, { backgroundColor: getParkingColor(parking.parkingType) }]}
                                            >
                                                <Icon name={getParkingIcon(parking.parkingType)} size={wp(5)} color="#FFFFFF" />
                                            </View>

                                            <View style={styles.parkingOptionInfo}>
                                                <Text style={styles.parkingOptionTitle}>Estacionamiento {index + 1}</Text>
                                                <Text style={styles.parkingOptionType}>
                                                    {parking.parkingType.replace("ESTACIONAMIENTO ", "")}
                                                </Text>
                                                <Text style={styles.parkingOptionDistance}>📍 {parking.distance.toFixed(0)}m de distancia</Text>
                                            </View>

                                            <Icon name="chevron-right" size={wp(5)} color="#BDC3C7" />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        ) : (
                            <View style={styles.noResultsContainer}>
                                <Icon name="search-off" size={wp(15)} color="#BDC3C7" />
                                <Text style={styles.noResultsTitle}>No hay estacionamientos cercanos</Text>
                                <Text style={styles.noResultsSubtitle}>
                                    No se encontraron espacios de estacionamiento permitidos en un radio de 200 metros desde tu ubicación
                                    actual.
                                </Text>

                                <View style={styles.noResultsButtons}>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => {
                                            setShowParkingOptionsModal(false)
                                            searchParkingDirectly()
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="refresh" size={wp(4)} color="#FFFFFF" />
                                        <Text style={styles.retryButtonText}>Buscar Nuevamente</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.finishButton}
                                        onPress={() => {
                                            setShowParkingOptionsModal(false)
                                            finalizeParkingPreview()
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="home" size={wp(4)} color="#FFFFFF" />
                                        <Text style={styles.finishButtonText}>Finalizar Viaje</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal de búsqueda de estacionamiento */}
            {isSearchingParking && (
                <Modal visible={true} transparent={true} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.searchingModal}>
                            <Icon name="search" size={wp(15)} color="#FF6B35" />
                            <Text style={styles.searchingTitle}>🔍 Buscando Estacionamiento</Text>
                            <Text style={styles.searchingSubtitle}>Analizando calles cercanas...</Text>
                            <View style={styles.loadingDots}>
                                <View style={styles.dot} />
                                <View style={styles.dot} />
                                <View style={styles.dot} />
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    map: {
        flex: 1,
    },
    // Indicadores de estado
    recalculatingIndicator: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(18) : hp(16),
        left: wp(4),
        right: wp(4),
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(52, 152, 219, 0.9)",
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: wp(2),
        zIndex: 20,
    },
    recalculatingText: {
        color: "#FFFFFF",
        fontSize: wp(3.5),
        fontWeight: "600",
        marginLeft: wp(2),
    },
    offRouteIndicator: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(18) : hp(16),
        left: wp(4),
        right: wp(4),
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(241, 196, 15, 0.9)",
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: wp(2),
        zIndex: 20,
    },
    offRouteText: {
        color: "#FFFFFF",
        fontSize: wp(3.5),
        fontWeight: "600",
        marginLeft: wp(2),
    },
    // Barra superior de estacionamiento
    parkingTopBar: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(6) : hp(4),
        left: wp(4),
        right: wp(4),
        zIndex: 15,
    },
    parkingTopBarContent: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#9B59B6",
        borderRadius: wp(3),
        paddingHorizontal: wp(4),
        paddingVertical: wp(3),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    parkingTopBarIcon: {
        marginRight: wp(3),
    },
    parkingTopBarText: {
        flex: 1,
    },
    parkingTopBarTitle: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
    },
    parkingTopBarDistance: {
        color: "#FFFFFF",
        fontSize: wp(3.2),
        opacity: 0.9,
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
        backgroundColor: "rgba(0,0,0,0.7)",
        borderRadius: wp(2),
        padding: wp(2),
    },
    logo: {
        width: wp(8),
        height: wp(8),
        borderRadius: wp(4),
    },
    finishHeaderButton: {
        backgroundColor: "rgba(231, 76, 60, 0.9)",
        borderRadius: wp(2),
        padding: wp(2),
    },
    rightControls: {
        position: "absolute",
        right: wp(4),
        top: Platform.OS === "ios" ? hp(15) : hp(13),
        zIndex: 10,
        gap: hp(1),
    },
    controlButton: {
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
    parkingButton: {
        backgroundColor: "#F4ECF7",
    },
    voiceButton: {
        backgroundColor: "#F8F9FA",
    },
    voiceButtonActive: {
        backgroundColor: "#FF6B35",
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    customMarker: {
        width: wp(8),
        height: wp(8),
        borderRadius: wp(4),
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    selectedMarker: {
        borderColor: "#FF6B35",
        borderWidth: 3,
        transform: [{ scale: 1.2 }],
    },
    routeInfoTop: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(12) : hp(10),
        left: wp(4),
        zIndex: 10,
    },
    routeStats: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: wp(1.5),
    },
    parkingRouteStats: {
        backgroundColor: "rgba(155, 89, 182, 0.9)",
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    statDivider: {
        width: 1,
        height: wp(4),
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: wp(2),
    },
    statText: {
        color: "#FFFFFF",
        fontSize: wp(3.2),
        fontWeight: "600",
        marginLeft: wp(1),
    },
    navigationCard: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? hp(4) : hp(2),
        left: wp(4),
        right: wp(4),
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        padding: wp(3),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        maxHeight: hp(30),
    },
    navigationContent: {
        gap: hp(1),
    },
    navigationModeIndicator: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F4ECF7",
        borderRadius: wp(2),
        padding: wp(2),
        marginBottom: hp(1),
    },
    navigationModeText: {
        fontSize: wp(3.2),
        color: "#9B59B6",
        fontWeight: "600",
        marginLeft: wp(2),
    },
    currentDirection: {
        flexDirection: "row",
        alignItems: "center",
    },
    directionIconContainer: {
        backgroundColor: "#FFF5F2",
        borderRadius: wp(2),
        padding: wp(2),
        marginRight: wp(2),
    },
    directionText: {
        flex: 1,
        fontSize: wp(3.8),
        color: "#2C3E50",
        fontWeight: "600",
        lineHeight: wp(5),
    },
    nextDirection: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(2),
        padding: wp(2),
    },
    thenText: {
        fontSize: wp(3),
        color: "#7F8C8D",
        marginRight: wp(2),
        fontWeight: "500",
    },
    nextDirectionText: {
        flex: 1,
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginLeft: wp(1),
    },
    cancelButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E74C3C",
        borderRadius: wp(2),
        paddingVertical: hp(1.2),
        marginTop: hp(0.5),
    },
    cancelButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.5),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    // Tarjeta de navegación para vista previa
    previewNavigationCard: {
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
    previewNavigationContent: {
        gap: hp(2),
    },
    previewNavigationHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    previewNavigationTitle: {
        fontSize: wp(4),
        color: "#9B59B6",
        fontWeight: "bold",
        marginLeft: wp(2),
    },
    previewNavigationInfo: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(2),
        padding: wp(3),
    },
    previewNavigationText: {
        flex: 1,
        fontSize: wp(3.5),
        color: "#2C3E50",
        marginLeft: wp(2),
        lineHeight: wp(5),
    },
    previewNavigationButtons: {
        flexDirection: "row",
        gap: wp(3),
    },
    previewAutoButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(2),
        paddingVertical: hp(1.5),
    },
    previewAutoButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.5),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    previewFinishButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E74C3C",
        borderRadius: wp(2),
        paddingVertical: hp(1.5),
    },
    previewFinishButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.5),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    // Estilos del modal de llegada
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: wp(4),
    },
    arrivalModal: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(5),
        padding: wp(6),
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
        maxWidth: wp(90),
        width: "100%",
    },
    confettiContainer: {
        position: "absolute",
        top: -50,
        left: 0,
        right: 0,
        height: 100,
        zIndex: 1,
    },
    confettiParticle: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    checkmarkContainer: {
        width: wp(20),
        height: wp(20),
        borderRadius: wp(10),
        backgroundColor: "#27AE60",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: hp(3),
        shadowColor: "#27AE60",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 12,
    },
    modalContent: {
        alignItems: "center",
        width: "100%",
    },
    arrivalTitle: {
        fontSize: wp(6.5),
        fontWeight: "bold",
        color: "#2C3E50",
        textAlign: "center",
        marginBottom: hp(1),
    },
    arrivalSubtitle: {
        fontSize: wp(4),
        color: "#7F8C8D",
        textAlign: "center",
        marginBottom: hp(3),
    },
    destinationInfo: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        padding: wp(3),
        marginBottom: hp(3),
        width: "100%",
    },
    destinationText: {
        fontSize: wp(3.5),
        color: "#2C3E50",
        marginLeft: wp(2),
        flex: 1,
        fontWeight: "500",
    },
    tripStats: {
        flexDirection: "row",
        justifyContent: "space-around",
        width: "100%",
        marginBottom: hp(3),
        gap: wp(3),
    },
    statCard: {
        flex: 1,
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        padding: wp(3),
    },
    statLabel: {
        fontSize: wp(3),
        color: "#7F8C8D",
        marginTop: 4,
    },
    statValue: {
        fontSize: wp(4),
        fontWeight: "bold",
        color: "#2C3E50",
        marginTop: 2,
    },
    arrivalButtons: {
        flexDirection: "row",
        width: "100%",
        gap: wp(3),
        marginBottom: hp(2),
    },
    searchParkingButton: {
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
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    searchParkingButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.8),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    finishTripButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#27AE60",
        borderRadius: wp(3),
        paddingVertical: hp(1.8),
        shadowColor: "#27AE60",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    finishTripButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.8),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    // Estilos del modal de estacionamiento
    parkingModal: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(5),
        padding: wp(6),
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
        maxWidth: wp(90),
        width: "100%",
    },
    questionContent: {
        alignItems: "center",
        width: "100%",
    },
    questionTitle: {
        fontSize: wp(5.5),
        fontWeight: "bold",
        color: "#2C3E50",
        textAlign: "center",
        marginTop: hp(2),
        marginBottom: hp(1),
    },
    questionSubtitle: {
        fontSize: wp(3.8),
        color: "#7F8C8D",
        textAlign: "center",
        marginBottom: hp(3),
        lineHeight: wp(5),
    },
    questionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        gap: wp(3),
    },
    yesButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#27AE60",
        borderRadius: wp(3),
        paddingVertical: hp(1.8),
    },
    yesButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.8),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    noButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(3),
        paddingVertical: hp(1.8),
    },
    noButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.8),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    // Estilos del modal de búsqueda
    searchingModal: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(5),
        padding: wp(6),
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
        maxWidth: wp(90),
        width: "100%",
    },
    searchingTitle: {
        fontSize: wp(5.5),
        fontWeight: "bold",
        color: "#2C3E50",
        textAlign: "center",
        marginTop: hp(2),
        marginBottom: hp(1),
    },
    searchingSubtitle: {
        fontSize: wp(3.8),
        color: "#7F8C8D",
        textAlign: "center",
        marginBottom: hp(3),
    },
    loadingDots: {
        flexDirection: "row",
        justifyContent: "center",
        gap: wp(2),
    },
    dot: {
        width: wp(2),
        height: wp(2),
        borderRadius: wp(1),
        backgroundColor: "#FF6B35",
    },
    // Estilos del modal de opciones de estacionamiento
    parkingOptionsModal: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: wp(5),
        borderTopRightRadius: wp(5),
        paddingTop: wp(4),
        paddingHorizontal: wp(4),
        maxHeight: hp(80),
        width: "100%",
        position: "absolute",
        bottom: 0,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: hp(1),
    },
    modalHeaderTitle: {
        fontSize: wp(5),
        fontWeight: "bold",
        color: "#2C3E50",
    },
    closeModalButton: {
        padding: wp(1),
    },
    modalSubtitle: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        marginBottom: hp(2),
    },
    navigationModeButtons: {
        marginBottom: hp(2),
    },
    automaticButton: {
        backgroundColor: "#FF6B35",
        borderRadius: wp(3),
        padding: wp(4),
        alignItems: "center",
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    automaticButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginTop: wp(1),
    },
    automaticButtonSubtext: {
        color: "#FFFFFF",
        fontSize: wp(3),
        opacity: 0.9,
        marginTop: 2,
    },
    parkingList: {
        flex: 1,
        marginBottom: hp(2),
    },
    parkingOptionItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        padding: wp(3),
        marginBottom: hp(1),
        borderWidth: 2,
        borderColor: "transparent",
    },
    selectedParkingItem: {
        backgroundColor: "#FFF5F2",
        borderColor: "#FF6B35",
    },
    parkingOptionIcon: {
        width: wp(12),
        height: wp(12),
        borderRadius: wp(6),
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp(3),
    },
    parkingOptionInfo: {
        flex: 1,
    },
    parkingOptionTitle: {
        fontSize: wp(4),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: 2,
    },
    parkingOptionType: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginBottom: 2,
    },
    parkingOptionDistance: {
        fontSize: wp(3),
        color: "#FF6B35",
        fontWeight: "500",
    },
    // Estilos para cuando no hay resultados
    noResultsContainer: {
        alignItems: "center",
        paddingVertical: hp(4),
        paddingHorizontal: wp(4),
    },
    noResultsTitle: {
        fontSize: wp(4.5),
        fontWeight: "bold",
        color: "#2C3E50",
        textAlign: "center",
        marginTop: hp(2),
        marginBottom: hp(1),
    },
    noResultsSubtitle: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        textAlign: "center",
        lineHeight: wp(5),
        marginBottom: hp(3),
    },
    noResultsButtons: {
        flexDirection: "row",
        gap: wp(3),
        width: "100%",
    },
    retryButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(3),
        paddingVertical: hp(1.5),
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.5),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    finishButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#27AE60",
        borderRadius: wp(3),
        paddingVertical: hp(1.5),
    },
    finishButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.5),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
})

export default NavegacionScreen
