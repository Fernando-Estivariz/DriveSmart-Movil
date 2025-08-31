"use client"

import { useEffect, useState } from "react"
import { StyleSheet, View, PermissionsAndroid, Platform, TouchableOpacity, Text } from "react-native"
import MapView, { Marker } from "react-native-maps"
import Geolocation from "@react-native-community/geolocation"
import Icon from "react-native-vector-icons/MaterialIcons"

export default function MapScreen() {
    const [currentPosition, setCurrentPosition] = useState(null)
    const [mapType, setMapType] = useState("standard")
    const [showMapTypes, setShowMapTypes] = useState(false)

    const mapTypes = [
        { key: "standard", label: "Estándar", icon: "map" },
        { key: "satellite", label: "Satélite", icon: "satellite" },
        { key: "hybrid", label: "Híbrido", icon: "layers" },
        { key: "terrain", label: "Terreno", icon: "terrain" },
    ]

    useEffect(() => {
        const requestLocationPermission = async () => {
            if (Platform.OS === "android") {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.log("Location permission denied")
                    return
                }
            }

            // Obtener la ubicación actual
            Geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords
                    setCurrentPosition({ latitude, longitude })
                },
                (error) => console.log(error),
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
            )
        }

        requestLocationPermission()
    }, [])

    const handleMapTypeChange = (type) => {
        setMapType(type)
        setShowMapTypes(false)
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                mapType={mapType}
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
            >
                {currentPosition && (
                    <Marker coordinate={currentPosition} title={"Tu ubicación"} description={"Estás aquí"} pinColor="#FF6B35" />
                )}
            </MapView>

            {/* Controles de tipo de mapa */}
            <View style={styles.mapControls}>
                <TouchableOpacity
                    style={styles.mapTypeButton}
                    onPress={() => setShowMapTypes(!showMapTypes)}
                    activeOpacity={0.8}
                >
                    <Icon name="layers" size={24} color="#2C3E50" />
                </TouchableOpacity>

                {showMapTypes && (
                    <View style={styles.mapTypeMenu}>
                        {mapTypes.map((type) => (
                            <TouchableOpacity
                                key={type.key}
                                style={[styles.mapTypeOption, mapType === type.key && styles.mapTypeOptionActive]}
                                onPress={() => handleMapTypeChange(type.key)}
                                activeOpacity={0.7}
                            >
                                <Icon name={type.icon} size={20} color={mapType === type.key ? "#FF6B35" : "#2C3E50"} />
                                <Text style={[styles.mapTypeText, mapType === type.key && styles.mapTypeTextActive]}>{type.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
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
    mapControls: {
        position: "absolute",
        top: 120,
        right: 16,
        zIndex: 10,
    },
    mapTypeButton: {
        backgroundColor: "#FFFFFF",
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
    mapTypeMenu: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        marginTop: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 120,
    },
    mapTypeOption: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    mapTypeOptionActive: {
        backgroundColor: "#FFF3E0",
    },
    mapTypeText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#2C3E50",
        fontWeight: "500",
    },
    mapTypeTextActive: {
        color: "#FF6B35",
        fontWeight: "600",
    },
})
