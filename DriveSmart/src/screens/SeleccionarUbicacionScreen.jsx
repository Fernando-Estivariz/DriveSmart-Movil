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

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(100)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current
    const markerBounce = useRef(new Animated.Value(1)).current

    // Función para obtener la dirección desde coordenadas
    const getAddressFromCoordinates = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${Config.GOOGLE_GEOCODING_API_KEY}&language=es`,
            )
            const data = await response.json()

            if (data.results && data.results.length > 0) {
                // Buscar la dirección más específica (route + street_number)
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

                // Construir la dirección
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
                    // Si no hay calle específica, usar la dirección formateada
                    address = result.formatted_address
                }

                return address || "Dirección no disponible"
            } else {
                return "Dirección no disponible"
            }
        } catch (error) {
            console.error("Error getting address:", error)
            return "Error al obtener dirección"
        }
    }

    useEffect(() => {
        // Obtener la ubicación actual del usuario al cargar la pantalla
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

                // Obtener la dirección inicial
                const address = await getAddressFromCoordinates(latitude, longitude)
                setStreetAddress(address)

                setIsLoading(false)

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
                console.log(error)
                setIsLoading(false)
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

        // Obtener la nueva dirección
        setStreetAddress("Obteniendo dirección...")
        const address = await getAddressFromCoordinates(newRegion.latitude, newRegion.longitude)
        setStreetAddress(address)

        // Animación de rebote del marcador
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

                // Obtener la dirección de la ubicación actual
                setStreetAddress("Obteniendo dirección...")
                const address = await getAddressFromCoordinates(latitude, longitude)
                setStreetAddress(address)
            },
            (error) => {
                console.log(error)
                setStreetAddress("Error al obtener ubicación")
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
        )
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
