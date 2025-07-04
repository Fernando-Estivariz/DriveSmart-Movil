"use client"

import { useEffect, useState, useRef } from "react"
import { View, StyleSheet, Dimensions, Animated, Text, TouchableOpacity, Modal } from "react-native"
import MapView, { Polygon } from "react-native-maps"
import axios from "axios"
import Config from "react-native-config"
import Geolocation from "@react-native-community/geolocation"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Icon from "react-native-vector-icons/MaterialIcons"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const MapaPlacas = () => {
    const [mapeados, setMapeados] = useState([])
    const [userLocation, setUserLocation] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [showAlert, setShowAlert] = useState(false)
    const [alertData, setAlertData] = useState(null)
    const [loading, setLoading] = useState(true)

    // Animaciones
    const pulseAnim = useRef(new Animated.Value(1)).current
    const slideAnim = useRef(new Animated.Value(-300)).current
    const fadeAnim = useRef(new Animated.Value(0)).current

    // Función para obtener el día actual y su restricción
    const getCurrentDayRestriction = () => {
        const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
        const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
        const restrictions = {
            1: { numbers: ["0", "1"], day: "Lunes" }, // Lunes
            2: { numbers: ["2", "3"], day: "Martes" }, // Martes
            3: { numbers: ["4", "5"], day: "Miércoles" }, // Miércoles
            4: { numbers: ["6", "7"], day: "Jueves" }, // Jueves
            5: { numbers: ["8", "9"], day: "Viernes" }, // Viernes
        }

        return restrictions[today] || null
    }

    // Función para verificar si una placa está restringida hoy
    const isPlateRestrictedToday = (placa) => {
        const currentRestriction = getCurrentDayRestriction()
        if (!currentRestriction || !placa) return false

        const lastDigit = placa.slice(-1)
        return currentRestriction.numbers.includes(lastDigit)
    }

    // Función para verificar si un punto está dentro de un polígono
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

    // Función para obtener el perfil del usuario
    const fetchUserProfile = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken")
            if (!token) {
                console.log("No hay token de usuario")
                return
            }

            const response = await axios.get(`${Config.API_URL}/get-profile`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            })

            setUserProfile(response.data)
            console.log("Perfil de usuario obtenido:", response.data)
        } catch (error) {
            console.error("Error al obtener el perfil del usuario:", error)
        }
    }

    // Función para obtener la ubicación actual
    const getCurrentLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords
                setUserLocation({ latitude, longitude })
                console.log("Ubicación actual:", { latitude, longitude })
            },
            (error) => {
                console.error("Error al obtener ubicación:", error)
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
            },
        )
    }

    // Función para obtener datos de mapeado
    const fetchMapeados = async () => {
        try {
            console.log("Intentando obtener datos de mapeado...")
            const response = await axios.get(`${Config.API_URL}/mapeado`, {
                headers: {
                    "Content-Type": "application/json",
                },
            })
            console.log("Datos recibidos:", response.data)
            setMapeados(response.data)
        } catch (error) {
            console.error("Error al obtener los datos de mapeado:", error)
        } finally {
            setLoading(false)
        }
    }

    // Función para verificar restricciones
    const checkRestrictions = () => {
        if (!userLocation || !userProfile || !mapeados.length) return

        const restrictionPolygons = mapeados.filter((mapeado) => mapeado.type === "polygon")

        for (const polygon of restrictionPolygons) {
            const polygonCoords = polygon.latlngs.map((coord) => ({
                latitude: coord[0],
                longitude: coord[1],
            }))

            if (isPointInPolygon(userLocation, polygonCoords)) {
                console.log("Usuario está dentro del área de restricción")

                if (isPlateRestrictedToday(userProfile.placa)) {
                    const currentRestriction = getCurrentDayRestriction()
                    setAlertData({
                        title: "⚠️ ZONA RESTRINGIDA",
                        message: `Tu vehículo con placa terminada en "${userProfile.placa.slice(
                            -1,
                        )}" no puede circular hoy ${currentRestriction.day} en esta zona.`,
                        restriction: currentRestriction,
                        userPlate: userProfile.placa,
                    })
                    setShowAlert(true)
                    startAlertAnimations()
                }
                break
            }
        }
    }

    // Animaciones para la alerta
    const startAlertAnimations = () => {
        // Animación de entrada
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start()

        // Animación de pulso continuo
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

    // Función para cerrar la alerta
    const closeAlert = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -300,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowAlert(false)
            setAlertData(null)
        })
    }

    // Efectos
    useEffect(() => {
        fetchMapeados()
        fetchUserProfile()
        getCurrentLocation()
    }, [])

    useEffect(() => {
        if (userLocation && userProfile && mapeados.length > 0) {
            checkRestrictions()
        }
    }, [userLocation, userProfile, mapeados])

    // Función para obtener el horario actual
    const getCurrentTime = () => {
        const now = new Date()
        const hour = now.getHours()

        // Verificar si está en horario de restricción (7:00 - 19:00)
        if (hour >= 7 && hour < 19) {
            return "EN HORARIO DE RESTRICCIÓN"
        }
        return "FUERA DE HORARIO DE RESTRICCIÓN"
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: -17.394728,
                    longitude: -66.152893,
                    latitudeDelta: 0.0422,
                    longitudeDelta: 0.0321,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                {mapeados.map((mapeado) => {
                    if (mapeado.type === "polygon") {
                        return (
                            <Polygon
                                key={mapeado.id}
                                coordinates={mapeado.latlngs.map((coord) => ({
                                    latitude: coord[0],
                                    longitude: coord[1],
                                }))}
                                strokeColor="rgba(255, 107, 53, 0.8)"
                                fillColor="rgba(255, 107, 53, 0.2)"
                                strokeWidth={3}
                            />
                        )
                    }
                    return null
                })}
            </MapView>

            {/* Modal de Alerta */}
            <Modal visible={showAlert} transparent={true} animationType="none">
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.alertContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }, { scale: pulseAnim }],
                            },
                        ]}
                    >
                        {/* Header de la alerta */}
                        <View style={styles.alertHeader}>
                            <View style={styles.warningIconContainer}>
                                <Icon name="warning" size={wp(8)} color="#FFFFFF" />
                            </View>
                            <TouchableOpacity style={styles.closeButton} onPress={closeAlert}>
                                <Icon name="close" size={wp(6)} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Contenido de la alerta */}
                        <View style={styles.alertContent}>
                            <Text style={styles.alertTitle}>{alertData?.title}</Text>
                            <Text style={styles.alertMessage}>{alertData?.message}</Text>

                            {/* Información de la placa */}
                            <View style={styles.plateContainer}>
                                <Text style={styles.plateLabel}>Tu Placa:</Text>
                                <View style={styles.plateDisplay}>
                                    <Text style={styles.plateText}>{alertData?.userPlate}</Text>
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
                        </View>

                        {/* Botones de acción */}
                        <View style={styles.alertActions}>
                            <TouchableOpacity style={styles.understandButton} onPress={closeAlert}>
                                <Icon name="check-circle" size={wp(5)} color="#FFFFFF" />
                                <Text style={styles.understandButtonText}>Entendido</Text>
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
    },
    map: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: wp(4),
    },
    alertContainer: {
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
    alertHeader: {
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
    closeButton: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: wp(4),
        padding: wp(1.5),
    },
    alertContent: {
        padding: wp(5),
    },
    alertTitle: {
        fontSize: wp(5.5),
        fontWeight: "bold",
        color: "#E74C3C",
        textAlign: "center",
        marginBottom: wp(3),
    },
    alertMessage: {
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
    },
    infoText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginLeft: wp(2),
        flex: 1,
        lineHeight: wp(4.5),
    },
    alertActions: {
        padding: wp(4),
        paddingTop: 0,
    },
    understandButton: {
        backgroundColor: "#27AE60",
        borderRadius: wp(3),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: wp(3.5),
        shadowColor: "#27AE60",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    understandButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
})

export default MapaPlacas
