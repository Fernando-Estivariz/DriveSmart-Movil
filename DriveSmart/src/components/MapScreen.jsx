"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { StyleSheet, View, PermissionsAndroid, Platform, TouchableOpacity, Text, Alert } from "react-native"
import MapView, { Marker, Polyline, Circle } from "react-native-maps"
import Geolocation from "@react-native-community/geolocation"
import Icon from "react-native-vector-icons/MaterialIcons"
import axios from "axios"
import Config from "react-native-config"

// Constantes de configuración
const LOCATION_UPDATE_DISTANCE = 10 // metros - actualizar cada 10m
const PARKING_SEARCH_RADIUS = 200 // metros
const PARKING_UPDATE_THRESHOLD = 50 // metros - buscar nuevos estacionamientos cada 50m
const LOCATION_TIMEOUT = 15000
const LOCATION_MAX_AGE = 5000
const MIN_ACCURACY = 50 // metros - ignorar ubicaciones con precisión > 50m

export default function MapScreen({ navigation }) {
    const [currentPosition, setCurrentPosition] = useState(null)
    const [nearbyParkings, setNearbyParkings] = useState([])
    const [selectedParking, setSelectedParking] = useState(null)
    const [routeCoordinates, setRouteCoordinates] = useState([])
    const [routeDistance, setRouteDistance] = useState(0)
    const [loading, setLoading] = useState(false)

    // Referencias para cleanup y control
    const watchIdRef = useRef(null)
    const lastParkingSearchLocationRef = useRef(null)
    const mapRef = useRef(null)
    const isInitializedRef = useRef(false)

    // Función para calcular distancia entre dos puntos
    const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
        const R = 6371 // Radio de la Tierra en km
        const dLat = ((lat2 - lat1) * Math.PI) / 180
        const dLon = ((lon2 - lon1) * Math.PI) / 180
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c * 1000 // Convertir a metros
    }, [])

    // Función para validar ubicación GPS
    const isValidLocation = useCallback((position) => {
        if (!position || !position.coords) return false

        const { latitude, longitude, accuracy } = position.coords

        // Validar coordenadas básicas
        if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return false
        }

        // Validar precisión
        if (accuracy && accuracy > MIN_ACCURACY) {
            
            return false
        }

        return true
    }, [])

    // Función para decodificar polyline de Google
    const decodePolyline = useCallback((encoded) => {
        const points = []
        let index = 0
        const len = encoded.length
        let lat = 0
        let lng = 0

        while (index < len) {
            let b
            let shift = 0
            let result = 0
            do {
                b = encoded.charAt(index++).charCodeAt(0) - 63
                result |= (b & 0x1f) << shift
                shift += 5
            } while (b >= 0x20)

            const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
            lat += dlat

            shift = 0
            result = 0
            do {
                b = encoded.charAt(index++).charCodeAt(0) - 63
                result |= (b & 0x1f) << shift
                shift += 5
            } while (b >= 0x20)

            const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
            lng += dlng

            points.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5,
            })
        }

        return points
    }, [])

    // Función para obtener ruta usando Google Directions (memoizada)
    const getRoute = useCallback(
        async (destination) => {
            if (!currentPosition) return

            setLoading(true)
            try {
                const origin = `${currentPosition.latitude},${currentPosition.longitude}`
                const dest = `${destination.midPoint.latitude},${destination.midPoint.longitude}`

                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${dest}&key=${Config.GOOGLE_MAPS_API_KEY}`,
                )
                const data = await response.json()

                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0]
                    const points = route.overview_polyline.points
                    const decodedPoints = decodePolyline(points)

                    setRouteCoordinates(decodedPoints)
                    setSelectedParking(destination)
                    setRouteDistance(route.legs[0].distance.value / 1000) // Convertir a km
                }
            } catch (error) {
                console.error("Error al obtener ruta:", error)
                Alert.alert("Error", "No se pudo obtener la ruta al estacionamiento")
            } finally {
                setLoading(false)
            }
        },
        [currentPosition, decodePolyline],
    )

    // Función para buscar calles de estacionamiento cercanas
    const findNearbyParkingStreets = useCallback(
        async (centerLocation, radius = PARKING_SEARCH_RADIUS) => {
            try {
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

                // Calcular distancias y encontrar las más cercanas
                const parkingWithDistances = parkingLines.map((line, index) => {
                    // Calcular el punto medio de la línea
                    const midIndex = Math.floor(line.latlngs.length / 2)
                    const midPoint = line.latlngs[midIndex]

                    // Calcular distancia desde el centro
                    const distance = calculateDistance(
                        centerLocation.latitude,
                        centerLocation.longitude,
                        midPoint[0],
                        midPoint[1],
                    )

                    return {
                        ...line,
                        id: `parking-${index}-${line.restriction}-${Math.round(midPoint[0] * 10000)}-${Math.round(midPoint[1] * 10000)}`, // Key estable basada en posición
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


                return nearbyParking
            } catch (error) {
                console.error("Error al buscar estacionamientos:", error)
                return []
            }
        },
        [calculateDistance],
    )

    // Función para actualizar estacionamientos si es necesario
    const updateParkingIfNeeded = useCallback(
        async (newLocation) => {
            const lastSearchLocation = lastParkingSearchLocationRef.current

            // Si no hay búsqueda previa o nos hemos movido lo suficiente
            if (
                !lastSearchLocation ||
                calculateDistance(
                    lastSearchLocation.latitude,
                    lastSearchLocation.longitude,
                    newLocation.latitude,
                    newLocation.longitude,
                ) >= PARKING_UPDATE_THRESHOLD
            ) {

                // Buscar nuevos estacionamientos
                const nearbyParking = await findNearbyParkingStreets(newLocation, PARKING_SEARCH_RADIUS)
                setNearbyParkings(nearbyParking)

                // Actualizar la última ubicación de búsqueda
                lastParkingSearchLocationRef.current = newLocation
            }
        },
        [calculateDistance, findNearbyParkingStreets],
    )

    // Función para manejar actualizaciones de ubicación
    const handleLocationUpdate = useCallback(
        async (position) => {
            if (!isValidLocation(position)) return

            const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            }


            // Actualizar posición actual
            setCurrentPosition(newLocation)

            // Actualizar estacionamientos si es necesario
            await updateParkingIfNeeded(newLocation)

            // Centrar mapa en la nueva ubicación
            if (mapRef.current) {
                mapRef.current.animateToRegion(
                    {
                        latitude: newLocation.latitude,
                        longitude: newLocation.longitude,
                        latitudeDelta: 0.0122,
                        longitudeDelta: 0.0021,
                    },
                    1000,
                )
            }
        },
        [isValidLocation, updateParkingIfNeeded],
    )

    // Función para obtener el color del tipo de estacionamiento
    const getParkingColor = useCallback((parkingType) => {
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
    }, [])

    // Función para obtener el icono del tipo de estacionamiento
    const getParkingIcon = useCallback((parkingType) => {
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
    }, [])

    // Función para seleccionar estacionamiento manualmente (memoizada)
    const selectParkingManually = useCallback(
        (parking) => {
            getRoute(parking)
        },
        [getRoute],
    )

    // Función para limpiar ruta
    const clearRoute = useCallback(() => {
        setRouteCoordinates([])
        setSelectedParking(null)
        setRouteDistance(0)
    }, [])

    // Inicializar seguimiento de ubicación - SOLO UNA VEZ
    useEffect(() => {
        if (isInitializedRef.current) return

        const initializeLocation = async () => {
            
            isInitializedRef.current = true

            // Solicitar permisos si es necesario
            if (Platform.OS === "android") {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    
                    Alert.alert(
                        "Permisos requeridos",
                        "Se necesitan permisos de ubicación para mostrar estacionamientos cercanos",
                    )
                    return
                }
            }

            // Obtener ubicación inicial
            Geolocation.getCurrentPosition(
                handleLocationUpdate,
                (error) => {
                    console.error("❌ Error al obtener ubicación inicial:", error)
                },
                {
                    enableHighAccuracy: true,
                    timeout: LOCATION_TIMEOUT,
                    maximumAge: LOCATION_MAX_AGE,
                },
            )

            // Iniciar seguimiento continuo
            watchIdRef.current = Geolocation.watchPosition(
                handleLocationUpdate,
                (error) => {
                    console.error("❌ Error en seguimiento de ubicación:", error)
                },
                {
                    enableHighAccuracy: true,
                    distanceFilter: LOCATION_UPDATE_DISTANCE,
                    interval: 5000,
                    fastestInterval: 2000,
                },
            )

            
        }

        initializeLocation()

        // Cleanup al desmontar
        return () => {
            if (watchIdRef.current !== null) {
                Geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
                
            }
        }
    }, []) // SIN DEPENDENCIAS - solo se ejecuta una vez

    // Memoizar coordenadas para evitar re-renders
    const memoizedParkings = useMemo(() => {
        return nearbyParkings.map((parking) => ({
            ...parking,
            coordinates: parking.latlngs.map((coord) => ({
                latitude: coord[0],
                longitude: coord[1],
            })),
        }))
    }, [nearbyParkings])

    return (
        <View style={styles.container}>
            {/* Barra superior morada cuando hay ruta */}
            {selectedParking && (
                <View style={styles.topBar}>
                    <View style={styles.topBarContent}>
                        <Icon name="local-parking" size={20} color="#FFFFFF" />
                        <Text style={styles.topBarText}>Estacionamiento</Text>
                        <View style={styles.topBarDistance}>
                            <Icon name="straighten" size={16} color="#FFFFFF" />
                            <Text style={styles.topBarDistanceText}>{routeDistance.toFixed(1)} km</Text>
                        </View>
                    </View>
                </View>
            )}

            <MapView
                ref={mapRef}
                style={styles.map}
                mapType="standard"
                region={
                    currentPosition
                        ? {
                            latitude: currentPosition.latitude,
                            longitude: currentPosition.longitude,
                            latitudeDelta: 0.0122,
                            longitudeDelta: 0.0021,
                        }
                        : {
                            latitude: -17.3751642,
                            longitude: -66.1586706,
                            latitudeDelta: 0.0122,
                            longitudeDelta: 0.0021,
                        }
                }
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                showsScale={false}
                showsBuildings={true}
                showsTraffic={false}
                showsIndoors={true}
                followsUserLocation={true}
                userLocationUpdateInterval={5000}
            >
                {/* Radio de búsqueda de estacionamientos - SE MUEVE CON EL USUARIO */}
                {currentPosition && (
                    <Circle
                        center={currentPosition}
                        radius={PARKING_SEARCH_RADIUS}
                        strokeColor="rgba(255, 107, 53, 0.5)"
                        fillColor="rgba(255, 107, 53, 0.1)"
                        strokeWidth={2}
                    />
                )}

                {/* Mostrar todas las líneas de estacionamiento cercanas */}
                {memoizedParkings.map((parking, index) => (
                    <View key={parking.id}>
                        <Polyline
                            coordinates={parking.coordinates}
                            strokeColor={getParkingColor(parking.parkingType)}
                            strokeWidth={selectedParking?.id === parking.id ? 6 : 3}
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
                                    selectedParking?.id === parking.id && styles.selectedMarker,
                                ]}
                            >
                                <Icon name={getParkingIcon(parking.parkingType)} size={20} color="#FFFFFF" />
                            </View>
                        </Marker>
                    </View>
                ))}

                {/* Ruta hacia el estacionamiento seleccionado */}
                {routeCoordinates.length > 0 && (
                    <Polyline coordinates={routeCoordinates} strokeColor="#9B59B6" strokeWidth={4} lineDashPattern={[5, 5]} />
                )}
            </MapView>

            {/* Botón para limpiar ruta */}
            {selectedParking && (
                <View style={styles.clearRouteContainer}>
                    <TouchableOpacity style={styles.clearRouteButton} onPress={clearRoute}>
                        <Icon name="clear" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Panel de información de estacionamientos */}
            {nearbyParkings.length > 0 && !selectedParking && (
                <View style={styles.infoPanel}>
                    <View style={styles.infoPanelHeader}>
                        <Icon name="local-parking" size={20} color="#FF6B35" />
                        <Text style={styles.infoPanelTitle}>
                            {nearbyParkings.length} Estacionamiento{nearbyParkings.length > 1 ? "s" : ""} Cercano
                            {nearbyParkings.length > 1 ? "s" : ""}
                        </Text>
                    </View>
                    <Text style={styles.infoPanelSubtitle}>Toca un marcador para ver la ruta</Text>
                    <Text style={styles.infoPanelDistance}>Radio de búsqueda: {PARKING_SEARCH_RADIUS}m</Text>
                </View>
            )}

            {/* Indicador de carga */}
            {loading && (
                <View style={styles.loadingIndicator}>
                    <Text style={styles.loadingText}>Calculando ruta...</Text>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    topBar: {
        position: "absolute",
        top: 100,
        left: 16,
        right: 16,
        zIndex: 15,
    },
    topBarContent: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#9B59B6",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    topBarText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
        marginLeft: 8,
        flex: 1,
    },
    topBarDistance: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    topBarDistanceText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 4,
    },
    clearRouteContainer: {
        position: "absolute",
        top: 160,
        right: 16,
        zIndex: 10,
    },
    clearRouteButton: {
        backgroundColor: "#E74C3C",
        borderRadius: 8,
        padding: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
    },
    customMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
    infoPanel: {
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    infoPanelHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    infoPanelTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#2C3E50",
        marginLeft: 8,
    },
    infoPanelSubtitle: {
        fontSize: 12,
        color: "#7F8C8D",
        marginLeft: 28,
    },
    infoPanelDistance: {
        fontSize: 11,
        color: "#95A5A6",
        marginLeft: 28,
        marginTop: 2,
    },
    loadingIndicator: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -50 }, { translateY: -25 }],
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    loadingText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "500",
    },
})
