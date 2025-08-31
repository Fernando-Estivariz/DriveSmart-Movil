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
} from "react-native"
import MapView, { Marker, Polyline, Circle } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import Geolocation from "@react-native-community/geolocation"
import { useRoute, useNavigation } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialIcons"
import axios from "axios"
import Config from "react-native-config"
import Tts from "react-native-tts"


const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100



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
        "Km\\.": "Kilómetro",
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
        "of\\.": "oficina",
        "Loc\\.": "Local",
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

const NavegacionScreen = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { origin, destinationLocation } = route.params

    const [currentLocation, setCurrentLocation] = useState(origin)
    const [routeDetails, setRouteDetails] = useState(null)
    const [steps, setSteps] = useState([])
    const [currentStep, setCurrentStep] = useState(0)
    const [is3DMode, setIs3DMode] = useState(false)
    const [isNavigationVisible, setIsNavigationVisible] = useState(true)
    const [showArrivalModal, setShowArrivalModal] = useState(false)
    const [showParkingModal, setShowParkingModal] = useState(false)
    const [showParkingOptionsModal, setShowParkingOptionsModal] = useState(false)
    const [showParkingPreview, setShowParkingPreview] = useState(false) // Nueva vista previa
    const [isSearchingParking, setIsSearchingParking] = useState(false)
    const [parkingOptions, setParkingOptions] = useState([])
    const [allNearbyParking, setAllNearbyParking] = useState([])
    const [selectedParkingSpot, setSelectedParkingSpot] = useState(null)
    const [currentParkingIndex, setCurrentParkingIndex] = useState(0)
    const [isNavigatingToParking, setIsNavigatingToParking] = useState(false)
    const [navigationMode, setNavigationMode] = useState("destination") // "destination" | "parking" | "preview"
    const [showParkingRadius, setShowParkingRadius] = useState(false)
    const [hasInitializedRoute, setHasInitializedRoute] = useState(false) // Para arreglar el bug
    const mapRef = useRef(null)

    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [lastSpokenInstruction, setLastSpokenInstruction] = useState("")

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(100)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const previewSlideAnim = useRef(new Animated.Value(-100)).current // Para la barra superior

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
    }, [])

    // Geolocalización en tiempo real
    useEffect(() => {
        const watchId = Geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords
                setCurrentLocation({ latitude, longitude })
            },
            (error) => console.log(error),
            { enableHighAccuracy: true, distanceFilter: 1 },
        )

        return () => Geolocation.clearWatch(watchId)
    }, [])

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

    const handleCancel = () => {
        navigation.navigate("Home")
    }

    const handleDirectionsReady = (result) => {
        setRouteDetails(result)
        setSteps(result.legs[0].steps)
        setCurrentStep(0)
        setHasInitializedRoute(true) // Marcar que la ruta se ha inicializado

        // Anunciar inicio de navegación
        if (!isNavigatingToParking && !showParkingPreview) {
            announceNavigationStart()
            updateCamera(currentLocation)
        }
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
                    id: `parking-${index}-${Date.now()}`,
                    midPoint: { latitude: midPoint[0], longitude: midPoint[1] },
                    distance: distance,
                    streetName: `Calle ${line.restriction.replace("ESTACIONAMIENTO ", "")}`,
                    parkingType: line.restriction,
                }
            })

            // Filtrar por radio y ordenar por distancia
            const nearbyParking = parkingWithDistances
                .filter((parking) => parking.distance <= radius)
                .sort((a, b) => a.distance - b.distance)

            console.log(`🎯 Encontradas ${nearbyParking.length} opciones dentro de ${radius}m`)

            return nearbyParking
        } catch (error) {
            console.error("❌ Error al buscar estacionamientos:", error)
            return []
        }
    }

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

    // Función para mostrar el modal de llegada con animaciones
    const showArrivalNotification = () => {
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
    }

    const closeArrivalModal = () => {
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

            // Mostrar modal de estacionamiento
            showParkingQuestion()
        })
    }

    // Función para mostrar la pregunta de estacionamiento
    const showParkingQuestion = () => {
        setShowParkingModal(true)

        Animated.parallel([
            Animated.timing(parkingModalFadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(parkingModalScaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start()
    }

    // Función para mostrar la vista previa de estacionamientos
    const showParkingPreviewMode = async () => {
        setIsSearchingParking(true)
        closeParkingModal()

        try {
            const nearbyParking = await findNearbyParkingStreets(currentLocation, 200)

            if (nearbyParking.length > 0) {
                setAllNearbyParking(nearbyParking)
                const topParking = nearbyParking.slice(0, 5)
                setParkingOptions(topParking)
                setCurrentParkingIndex(0)

                // Cambiar a modo preview
                setNavigationMode("preview")
                setShowParkingPreview(true)
                setShowParkingRadius(true)
                setHasInitializedRoute(false) // Reset para nueva ruta

                // Animar la barra superior
                Animated.timing(previewSlideAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start()

                // Centrar mapa para mostrar área de estacionamientos
                if (mapRef.current && nearbyParking.length > 0) {
                    const distances = nearbyParking.map((p) => p.distance)
                    const maxDistance = Math.max(...distances)
                    const padding = Math.max((maxDistance / 1000) * 0.01, 0.005) // Convertir a grados aproximados

                    mapRef.current.animateToRegion(
                        {
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                            latitudeDelta: padding * 2,
                            longitudeDelta: padding * 2,
                        },
                        1000,
                    )
                }
            } else {
                setParkingOptions([])
                setAllNearbyParking([])
            }
        } catch (error) {
            console.error("Error buscando estacionamientos:", error)
            setParkingOptions([])
            setAllNearbyParking([])
        } finally {
            setIsSearchingParking(false)
        }
    }

    // Función para manejar la respuesta de estacionamiento
    const handleParkingResponse = async (foundParking) => {
        if (foundParking) {
            // Usuario encontró estacionamiento, finalizar viaje
            closeParkingModal()
            navigation.navigate("Home")
        } else {
            // Mostrar vista previa de estacionamientos
            showParkingPreviewMode()
        }
    }

    const closeParkingModal = () => {
        Animated.parallel([
            Animated.timing(parkingModalFadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(parkingModalScaleAnim, {
                toValue: 0.5,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowParkingModal(false)
            parkingModalFadeAnim.setValue(0)
            parkingModalScaleAnim.setValue(0.5)
        })
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
            announceNavigationMode("parking")
            setShowParkingPreview(false)
            setShowParkingOptionsModal(false)
            setHasInitializedRoute(false) // Reset para nueva ruta

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

    // Función para seleccionar estacionamiento manualmente
    const selectParkingManually = (parking) => {
        setSelectedParkingSpot(parking)
        setIsNavigatingToParking(true)
        setNavigationMode("parking")
        announceNavigationMode("parking")
        setShowParkingPreview(false)
        setShowParkingOptionsModal(false)
        setHasInitializedRoute(false) // Reset para nueva ruta

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
            setHasInitializedRoute(false) // Reset para nueva ruta

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
            // No hay más opciones, finalizar
            setIsNavigatingToParking(false)
            setSelectedParkingSpot(null)
            setNavigationMode("destination")
            setShowParkingRadius(false)
            navigation.navigate("Home")
        }
    }

    // Función para confirmar estacionamiento encontrado
    const confirmParkingFound = () => {
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
    const finalizeParkingPreview = () => {
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

    useEffect(() => {
        if (steps.length > 0 && hasInitializedRoute) {
            const { distance } = steps[currentStep]
            const remainingDistance = distance?.value || 100

            if (remainingDistance < 50) {
                setCurrentStep((prevStep) => Math.min(prevStep + 1, steps.length - 1))
            }

            // Hablar la instrucción actual si el asistente está activado
            if (steps[currentStep] && isVoiceEnabled) {
                const instruction = steps[currentStep].html_instructions
                speakInstruction(instruction)
            }

            // Hablar la próxima instrucción cuando esté cerca
            if (steps[currentStep + 1] && remainingDistance < 100 && isVoiceEnabled) {
                const nextInstruction = steps[currentStep + 1].html_instructions
                speakInstruction(`En 100 metros, ${nextInstruction}`)
            }

            const lastStep = steps[steps.length - 1]
            if (lastStep && remainingDistance < 20) {
                if (navigationMode === "parking") {
                    // Llegó al estacionamiento
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
        }
    }, [currentLocation, steps, currentStep, navigationMode, hasInitializedRoute, isVoiceEnabled])

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
        return (minDistance / 1000).toFixed(1) // Convertir a km
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
                {navigationMode === "destination" && <Marker coordinate={destinationLocation} title="Destino" />}

                {/* Radio de búsqueda de estacionamientos */}
                {showParkingRadius && (
                    <Circle
                        center={currentLocation}
                        radius={200}
                        strokeColor="rgba(255, 107, 53, 0.5)"
                        fillColor="rgba(255, 107, 53, 0.1)"
                        strokeWidth={2}
                    />
                )}

                {/* Mostrar todas las líneas de estacionamiento cercanas */}
                {allNearbyParking.map((parking, index) => (
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
                            description={parking.parkingType.replace("ESTACIONAMIENTO ", "")}
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
                ))}

                {/* Ruta principal al destino */}
                {navigationMode === "destination" && (
                    <MapViewDirections
                        origin={currentLocation}
                        destination={destinationLocation}
                        apikey={Config.GOOGLE_MAPS_APIKEY}
                        language="es"
                        strokeWidth={6}
                        strokeColor="#FF6B35"
                        optimizeWaypoints={true}
                        onReady={handleDirectionsReady}
                        onError={(errorMessage) => {
                            console.log("Error en la dirección: ", errorMessage)
                        }}
                    />
                )}

                {/* Ruta al estacionamiento seleccionado */}
                {navigationMode === "parking" && selectedParkingSpot && (
                    <MapViewDirections
                        origin={currentLocation}
                        destination={selectedParkingSpot.midPoint}
                        apikey={Config.GOOGLE_MAPS_APIKEY}
                        language="es"
                        strokeWidth={6}
                        strokeColor="#9B59B6"
                        optimizeWaypoints={true}
                        onReady={handleDirectionsReady}
                        onError={(errorMessage) => {
                            console.log("Error en la dirección al estacionamiento: ", errorMessage)
                        }}
                    />
                )}
            </MapView>

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
                            <Text style={styles.statText}>{routeDetails.distance.toFixed(1)} km</Text>
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
                            <Text style={styles.previewNavigationTitle}>Navegando al estacionamiento</Text>
                        </View>

                        <View style={styles.previewNavigationInfo}>
                            <Icon name="navigation" size={wp(6)} color="#FF6B35" />
                            <Text style={styles.previewNavigationText}>
                                Selecciona un estacionamiento en el mapa o usa navegación automática
                            </Text>
                        </View>

                        <View style={styles.previewNavigationButtons}>
                            <TouchableOpacity style={styles.previewAutoButton} onPress={startAutomaticNavigation} activeOpacity={0.8}>
                                <Icon name="navigation" size={wp(4)} color="#FFFFFF" />
                                <Text style={styles.previewAutoButtonText}>Automático</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.previewFinishButton} onPress={finalizeParkingPreview} activeOpacity={0.8}>
                                <Icon name="close" size={wp(4)} color="#FFFFFF" />
                                <Text style={styles.previewFinishButtonText}>Finalizar</Text>
                            </TouchableOpacity>
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
                                        <Text style={styles.statValue}>{routeDetails.distance.toFixed(1)} km</Text>
                                    </View>
                                </View>
                            )}

                            {/* Botón de finalizar */}
                            <TouchableOpacity style={styles.finishButton} onPress={closeArrivalModal} activeOpacity={0.8}>
                                <Icon name="local-parking" size={wp(4)} color="#FFFFFF" />
                                <Text style={styles.finishButtonText}>Buscar Estacionamiento</Text>
                            </TouchableOpacity>

                            {/* Mensaje adicional */}
                            <Text style={styles.thankYouText}>¡Gracias por usar DriveSmart!</Text>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Modal de pregunta de estacionamiento */}
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
                        {isSearchingParking ? (
                            // Estado de búsqueda
                            <View style={styles.searchingContent}>
                                <Icon name="search" size={wp(15)} color="#FF6B35" />
                                <Text style={styles.searchingTitle}>🔍 Buscando Estacionamiento</Text>
                                <Text style={styles.searchingSubtitle}>Analizando calles cercanas...</Text>
                                <View style={styles.loadingDots}>
                                    <View style={styles.dot} />
                                    <View style={styles.dot} />
                                    <View style={styles.dot} />
                                </View>
                            </View>
                        ) : (
                            // Pregunta inicial
                            <View style={styles.questionContent}>
                                <Icon name="local-parking" size={wp(12)} color="#FF6B35" />
                                <Text style={styles.questionTitle}>🅿️ ¿Encontraste Estacionamiento?</Text>
                                <Text style={styles.questionSubtitle}>
                                    ¿Pudiste encontrar un lugar para aparcar cerca de tu destino?
                                </Text>

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
                                        <Text style={styles.noButtonText}>No, buscar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
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

                        <Text style={styles.modalSubtitle}>Encontramos {allNearbyParking.length} opciones dentro de 200m</Text>

                        {/* Botones de navegación */}
                        <View style={styles.navigationModeButtons}>
                            <TouchableOpacity style={styles.automaticButton} onPress={startAutomaticNavigation} activeOpacity={0.8}>
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
                                    <View style={[styles.parkingOptionIcon, { backgroundColor: getParkingColor(parking.parkingType) }]}>
                                        <Icon name={getParkingIcon(parking.parkingType)} size={wp(5)} color="#FFFFFF" />
                                    </View>

                                    <View style={styles.parkingOptionInfo}>
                                        <Text style={styles.parkingOptionTitle}>Estacionamiento {index + 1}</Text>
                                        <Text style={styles.parkingOptionType}>{parking.parkingType.replace("ESTACIONAMIENTO ", "")}</Text>
                                        <Text style={styles.parkingOptionDistance}>📍 {parking.distance.toFixed(0)}m de distancia</Text>
                                    </View>

                                    <Icon name="chevron-right" size={wp(5)} color="#BDC3C7" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    finishButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(3),
        paddingVertical: hp(1.8),
        paddingHorizontal: wp(6),
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: hp(2),
    },
    finishButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.8),
        fontWeight: "bold",
        marginLeft: wp(1),
    },
    thankYouText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        textAlign: "center",
        fontStyle: "italic",
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
    // Estilos para búsqueda
    searchingContent: {
        alignItems: "center",
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
})

export default NavegacionScreen
