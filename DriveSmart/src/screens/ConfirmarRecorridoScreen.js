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
} from "react-native"
import MapView, { Marker } from "react-native-maps"
import Geolocation from "@react-native-community/geolocation"
import MapViewDirections from "react-native-maps-directions"
import { useRoute, useNavigation } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialIcons"
import Config from "react-native-config"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const ConfirmarRecorridoScreen = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { destinationLocation } = route.params

    const [origin, setOrigin] = useState(null)
    const [region, setRegion] = useState(null)
    const [distance, setDistance] = useState(null)
    const [duration, setDuration] = useState(null)
    const [routeDetails, setRouteDetails] = useState([])
    const [loadingRoute, setLoadingRoute] = useState(true)
    const [originAddress, setOriginAddress] = useState("Obteniendo ubicación...")
    const [destinationAddress, setDestinationAddress] = useState("Cargando destino...")

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(100)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current

    // Función para obtener dirección desde coordenadas
    const getAddressFromCoordinates = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${Config.GOOGLE_MAPS_APIKEY}&language=es`,
            )
            const data = await response.json()

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

                return address
            } else {
                return "Dirección no disponible"
            }
        } catch (error) {
            console.error("Error getting address:", error)
            return "Error al obtener dirección"
        }
    }

    useEffect(() => {
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
                const originAddr = await getAddressFromCoordinates(latitude, longitude)
                setOriginAddress(originAddr)

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
                setOriginAddress("Error al obtener ubicación")
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
        )

        // Obtener dirección del destino si ya viene con address, sino calcularla
        const getDestinationAddress = async () => {
            if (destinationLocation.address) {
                setDestinationAddress(destinationLocation.address)
            } else {
                const destAddr = await getAddressFromCoordinates(destinationLocation.latitude, destinationLocation.longitude)
                setDestinationAddress(destAddr)
            }
        }

        getDestinationAddress()
    }, [])

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
        callback && callback()
    }

    const handleCancel = () => {
        animateButton(() => navigation.goBack())
    }

    const handleMenu = () => {
        navigation.navigate("MenuScreen")
    }

    const handleStart = () => {
        if (loadingRoute) {
            Alert.alert("Calculando ruta", "Por favor, espere a que se calcule la ruta.")
        } else if (routeDetails.length > 0) {
            animateButton(() => {
                navigation.navigate("NavegacionScreen", {
                    origin, // Coordenadas exactas
                    destinationLocation, // Coordenadas exactas + dirección
                    routeDetails,
                })
            })
        } else {
            Alert.alert("Error", "No se pudo calcular la ruta.")
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Mapa */}
            <MapView style={styles.map} region={region} showsUserLocation={true} loadingEnabled={true}>
                {origin && <Marker coordinate={origin} title="Ubicación Actual" pinColor="blue" />}

                {destinationLocation && <Marker coordinate={destinationLocation} title="Destino" pinColor="red" />}

                {origin && destinationLocation && (
                    <MapViewDirections
                        origin={origin}
                        destination={destinationLocation}
                        apikey={Config.GOOGLE_MAPS_APIKEY}
                        strokeWidth={5}
                        strokeColor="#FF6B35"
                        onStart={() => {
                            setLoadingRoute(true)
                        }}
                        onReady={(result) => {
                            setDistance(result.distance)
                            setDuration(result.duration)
                            setRouteDetails(result.legs[0].steps)
                            setLoadingRoute(false)
                        }}
                        onError={(errorMessage) => {
                            console.log("Error en la dirección: ", errorMessage)
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
                                {originAddress}
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
                                {destinationAddress}
                            </Text>
                        </View>
                    </View>

                    {/* Información de ruta */}
                    {distance && duration && (
                        <View style={styles.routeStats}>
                            <View style={styles.statItem}>
                                <Icon name="straighten" size={wp(4)} color="#FF6B35" />
                                <Text style={styles.statLabel}>Distancia</Text>
                                <Text style={styles.statValue}>{distance.toFixed(1)} km</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Icon name="schedule" size={wp(4)} color="#FF6B35" />
                                <Text style={styles.statLabel}>Tiempo</Text>
                                <Text style={styles.statValue}>{Math.ceil(duration)} min</Text>
                            </View>
                        </View>
                    )}

                    {/* Indicador de carga */}
                    {loadingRoute && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#FF6B35" />
                            <Text style={styles.loadingText}>Calculando ruta...</Text>
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
                        style={[styles.startButton, loadingRoute && styles.startButtonDisabled]}
                        onPress={handleStart}
                        disabled={loadingRoute}
                        activeOpacity={0.8}
                    >
                        <Icon name="navigation" size={wp(4)} color="#FFFFFF" />
                        <Text style={styles.startButtonText}>Empezar</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
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
})

export default ConfirmarRecorridoScreen
