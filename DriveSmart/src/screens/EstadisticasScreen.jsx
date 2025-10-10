"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
} from "react-native"
import MapView, { Heatmap } from "react-native-maps"
import Icon from "react-native-vector-icons/MaterialIcons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import Config from "react-native-config"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const EstadisticasScreen = ({ navigation }) => {
    // Estados para datos
    const [estadisticas, setEstadisticas] = useState({
        totalViajes: 0,
        kilometrosRecorridos: 0,
        tiempoAhorrado: 0,
        viajesCompletados: 0,
        viajesCancelados: 0,
        viajesConParking: 0,
        viajesSinParking: 0,
    })

    const [datosGraficos, setDatosGraficos] = useState({
        viajesPorDia: [0, 0, 0, 0, 0, 0, 0],
        heatmapData: [],
    })

    const [filtroActivo, setFiltroActivo] = useState("7dias")
    const [loading, setLoading] = useState(true)

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(50)).current
    const cardAnimations = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current

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
        ]).start()

        // Animación escalonada de las cards
        const cardAnimationSequence = cardAnimations.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: index * 150,
                useNativeDriver: true,
            }),
        )

        Animated.stagger(150, cardAnimationSequence).start()

        cargarEstadisticas()
    }, [filtroActivo])

    const cargarEstadisticas = async () => {
        try {
            setLoading(true)
            const token = await AsyncStorage.getItem("authToken")

            if (!token) {
                navigation.navigate("LogingScreen")
                return
            }

            // Calcular fechas según el filtro
            const fechaFin = new Date()
            const fechaInicio = new Date()

            switch (filtroActivo) {
                case "7dias":
                    fechaInicio.setDate(fechaFin.getDate() - 7)
                    break
                case "30dias":
                    fechaInicio.setDate(fechaFin.getDate() - 30)
                    break
                case "3meses":
                    fechaInicio.setMonth(fechaFin.getMonth() - 3)
                    break
                default:
                    fechaInicio.setFullYear(2020) // Todo el tiempo
            }

            const response = await axios.get(`${Config.API_URL}/estadisticas`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                params: {
                    fechaInicio: fechaInicio.toISOString(),
                    fechaFin: fechaFin.toISOString(),
                },
                timeout: 10000,
            })

            if (response.data.success) {
                setEstadisticas(response.data.estadisticas)
                setDatosGraficos(response.data.graficos)
            }
        } catch (error) {
            console.error("Error cargando estadísticas:", error)

            // Si es error 401, limpiar token y redirigir
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem("authToken")
                navigation.navigate("LoginScreen")
                return
            }

            // Datos de ejemplo para desarrollo
            setEstadisticas({
                totalViajes: 25,
                kilometrosRecorridos: 150.5,
                tiempoAhorrado: 120,
                viajesCompletados: 23,
                viajesCancelados: 2,
                viajesConParking: 15,
                viajesSinParking: 10,
            })
            setDatosGraficos({
                viajesPorDia: [2, 3, 1, 4, 2, 5, 1],
                heatmapData: [
                    { latitude: -17.3935, longitude: -66.157, weight: 1 },
                    { latitude: -17.3945, longitude: -66.158, weight: 0.8 },
                    { latitude: -17.3925, longitude: -66.156, weight: 0.6 },
                ],
            })
        } finally {
            setLoading(false)
        }
    }

    const filtros = [
        { key: "7dias", label: "7 días", icon: "today" },
        { key: "30dias", label: "30 días", icon: "date-range" },
        { key: "3meses", label: "3 meses", icon: "calendar-month" },
        { key: "todo", label: "Todo", icon: "all-inclusive" },
    ]

    const formatearTiempo = (minutos) => {
        const horas = Math.floor(minutos / 60)
        const mins = minutos % 60
        if (horas > 0) {
            return `${horas}h ${mins}m`
        }
        return `${mins}m`
    }

    const formatearDistancia = (km) => {
        if (km >= 1000) {
            return `${(km / 1000).toFixed(1)}k km`
        }
        return `${km.toFixed(1)} km`
    }

    const renderCard = (titulo, valor, subtitulo, icono, color, index) => (
        <Animated.View
            key={index}
            style={[
                styles.statCard,
                {
                    opacity: cardAnimations[index],
                    transform: [
                        {
                            translateY: cardAnimations[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [30, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={[styles.cardIcon, { backgroundColor: color + "20" }]}>
                <Icon name={icono} size={wp(6)} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{valor}</Text>
                <Text style={styles.cardTitle}>{titulo}</Text>
                {subtitulo && <Text style={styles.cardSubtitle}>{subtitulo}</Text>}
            </View>
        </Animated.View>
    )

    // Componente de gráfico de barras personalizado
    const CustomBarChart = ({ data, labels }) => {
        const maxValue = Math.max(...data, 1)

        return (
            <View style={styles.customBarChart}>
                <View style={styles.barsContainer}>
                    {data.map((value, index) => (
                        <View key={index} style={styles.barColumn}>
                            <Text style={styles.barValue}>{value > 0 ? value : ""}</Text>
                            <View style={styles.barWrapper}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            height: (value / maxValue) * hp(15),
                                            backgroundColor: value > 0 ? "#FF6B35" : "#E1E8ED",
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.barLabel}>{labels[index]}</Text>
                        </View>
                    ))}
                </View>
            </View>
        )
    }

    // Componente de gráfico circular personalizado
    const CustomPieChart = ({ completados, cancelados }) => {
        const total = completados + cancelados
        if (total === 0) return null

        const completadosPercentage = (completados / total) * 100
        const canceladosPercentage = (cancelados / total) * 100

        return (
            <View style={styles.customPieChart}>
                <View style={styles.pieContainer}>
                    <View style={styles.pieChart}>
                        <View
                            style={[
                                styles.pieSlice,
                                styles.completadosSlice,
                                {
                                    transform: [{ rotate: "0deg" }],
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.pieSlice,
                                styles.canceladosSlice,
                                {
                                    transform: [{ rotate: `${(completadosPercentage / 100) * 360}deg` }],
                                },
                            ]}
                        />
                        <View style={styles.pieCenter}>
                            <Text style={styles.pieCenterText}>{total}</Text>
                            <Text style={styles.pieCenterLabel}>Viajes</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.pieLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: "#27AE60" }]} />
                        <Text style={styles.legendText}>Completados ({completados})</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: "#E74C3C" }]} />
                        <Text style={styles.legendText}>Cancelados ({cancelados})</Text>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Icon name="arrow-back" size={wp(6)} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mis Estadísticas</Text>
                <View style={styles.headerSpacer} />
            </Animated.View>

            {/* Filtros */}
            <Animated.View style={[styles.filtrosContainer, { opacity: fadeAnim }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosScroll}>
                    {filtros.map((filtro) => (
                        <TouchableOpacity
                            key={filtro.key}
                            style={[styles.filtroButton, filtroActivo === filtro.key && styles.filtroButtonActive]}
                            onPress={() => setFiltroActivo(filtro.key)}
                            activeOpacity={0.7}
                        >
                            <Icon name={filtro.icon} size={wp(4)} color={filtroActivo === filtro.key ? "#FFFFFF" : "#7F8C8D"} />
                            <Text style={[styles.filtroText, filtroActivo === filtro.key && styles.filtroTextActive]}>
                                {filtro.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Cards de estadísticas principales */}
                <Animated.View
                    style={[
                        styles.statsGrid,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideUpAnim }],
                        },
                    ]}
                >
                    {renderCard(
                        "Total Viajes",
                        estadisticas.totalViajes.toString(),
                        filtroActivo === "7dias" ? "Esta semana" : "En el período",
                        "directions-car",
                        "#FF6B35",
                        0,
                    )}
                    {renderCard(
                        "Kilómetros",
                        formatearDistancia(estadisticas.kilometrosRecorridos),
                        "Recorridos",
                        "straighten",
                        "#3498DB",
                        1,
                    )}
                    {renderCard(
                        "Tiempo Ahorrado",
                        formatearTiempo(estadisticas.tiempoAhorrado),
                        "Con DriveSmart",
                        "schedule",
                        "#27AE60",
                        2,
                    )}
                    {renderCard(
                        "Éxito Parking",
                        `${Math.round((estadisticas.viajesConParking / Math.max(estadisticas.totalViajes, 1)) * 100)}%`,
                        "Encontrado",
                        "local-parking",
                        "#9B59B6",
                        3,
                    )}
                </Animated.View>

                {/* Gráfico de barras personalizado - Viajes por día */}
                <Animated.View style={[styles.chartContainer, { opacity: fadeAnim }]}>
                    <Text style={styles.chartTitle}>Actividad Semanal</Text>
                    <CustomBarChart data={datosGraficos.viajesPorDia} labels={["L", "M", "M", "J", "V", "S", "D"]} />
                </Animated.View>

                {/* Mapa de calor - Always visible */}
                <Animated.View style={[styles.heatmapContainer, { opacity: fadeAnim }]}>
                    <Text style={styles.chartTitle}>Mapa de Calor - Tus Rutas</Text>
                    <View style={styles.mapContainer}>
                        <MapView
                            style={styles.heatmap}
                            initialRegion={{
                                latitude: -17.3935,
                                longitude: -66.157,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            mapType="standard"
                        >
                            {datosGraficos.heatmapData.length > 0 && (
                                <Heatmap
                                    points={datosGraficos.heatmapData}
                                    radius={50}
                                    opacity={0.7}
                                    gradient={{
                                        colors: ["#00FF00", "#FFFF00", "#FF0000"],
                                        startPoints: [0.2, 0.5, 1.0],
                                        colorMapSize: 256,
                                    }}
                                />
                            )}
                        </MapView>
                    </View>
                    <Text style={styles.heatmapDescription}>
                        Las zonas rojas muestran donde más viajas. Las verdes son menos frecuentes.
                    </Text>
                </Animated.View>

                {/* Gráfico circular personalizado - Estado de viajes */}
                {estadisticas.totalViajes > 0 && (
                    <Animated.View style={[styles.chartContainer, { opacity: fadeAnim }]}>
                        <Text style={styles.chartTitle}>Estado de Viajes</Text>
                        <CustomPieChart completados={estadisticas.viajesCompletados} cancelados={estadisticas.viajesCancelados} />
                    </Animated.View>
                )}

                {/* Mensaje motivacional */}
                <Animated.View style={[styles.motivationalCard, { opacity: fadeAnim }]}>
                    <Icon name="emoji-events" size={wp(8)} color="#F39C12" />
                    <Text style={styles.motivationalTitle}>¡Excelente trabajo!</Text>
                    <Text style={styles.motivationalText}>
                        {estadisticas.totalViajes > 10
                            ? "Eres un conductor experimentado con DriveSmart"
                            : "¡Sigue explorando con DriveSmart!"}
                    </Text>
                </Animated.View>

                {loading && (
                    <View style={styles.loadingContainer}>
                        <Icon name="refresh" size={wp(8)} color="#FF6B35" />
                        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: wp(4),
        paddingTop: Platform.OS === "ios" ? hp(6) : hp(4),
        paddingBottom: hp(2),
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        padding: wp(2),
    },
    headerTitle: {
        fontSize: wp(5),
        fontWeight: "bold",
        color: "#2C3E50",
    },
    headerSpacer: {
        width: wp(10), // Same width as the removed button to maintain centering
    },
    filtrosContainer: {
        backgroundColor: "#FFFFFF",
        paddingVertical: hp(1),
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    filtrosScroll: {
        paddingHorizontal: wp(4),
        gap: wp(2),
    },
    filtroButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(5),
        paddingHorizontal: wp(3),
        paddingVertical: wp(2),
        marginRight: wp(2),
    },
    filtroButtonActive: {
        backgroundColor: "#FF6B35",
    },
    filtroText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginLeft: wp(1),
        fontWeight: "500",
    },
    filtroTextActive: {
        color: "#FFFFFF",
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: hp(4),
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: wp(4),
        paddingTop: hp(2),
        gap: hp(1.5),
    },
    statCard: {
        width: wp(42),
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        padding: wp(3),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: "center",
    },
    cardIcon: {
        width: wp(12),
        height: wp(12),
        borderRadius: wp(6),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: hp(1),
    },
    cardContent: {
        alignItems: "center",
    },
    cardValue: {
        fontSize: wp(5),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: wp(3.2),
        color: "#2C3E50",
        fontWeight: "600",
        textAlign: "center",
    },
    cardSubtitle: {
        fontSize: wp(2.8),
        color: "#7F8C8D",
        marginTop: 2,
        textAlign: "center",
    },
    chartContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        marginHorizontal: wp(4),
        marginTop: hp(2),
        padding: wp(3),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: "center",
    },
    chartTitle: {
        fontSize: wp(4),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: hp(2),
        textAlign: "center",
    },
    // Estilos para gráfico de barras personalizado
    customBarChart: {
        width: "100%",
        alignItems: "center",
    },
    barsContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-around",
        width: "100%",
        height: hp(20),
        paddingHorizontal: wp(2),
    },
    barColumn: {
        alignItems: "center",
        flex: 1,
        marginHorizontal: wp(1),
    },
    barValue: {
        fontSize: wp(3),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: hp(0.5),
        minHeight: wp(4),
    },
    barWrapper: {
        justifyContent: "flex-end",
        height: hp(15),
        width: "100%",
    },
    bar: {
        backgroundColor: "#FF6B35",
        borderRadius: wp(1),
        minHeight: 2,
        width: "100%",
    },
    barLabel: {
        fontSize: wp(3),
        color: "#7F8C8D",
        marginTop: hp(0.5),
        fontWeight: "500",
    },
    // Estilos para gráfico circular personalizado
    customPieChart: {
        alignItems: "center",
        width: "100%",
    },
    pieContainer: {
        alignItems: "center",
        marginBottom: hp(2),
    },
    pieChart: {
        width: wp(40),
        height: wp(40),
        borderRadius: wp(20),
        position: "relative",
        backgroundColor: "#E74C3C",
        overflow: "hidden",
    },
    pieSlice: {
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: wp(20),
    },
    completadosSlice: {
        backgroundColor: "#27AE60",
    },
    canceladosSlice: {
        backgroundColor: "#E74C3C",
    },
    pieCenter: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -wp(8) }, { translateY: -wp(4) }],
        alignItems: "center",
        justifyContent: "center",
        width: wp(16),
        height: wp(8),
    },
    pieCenterText: {
        fontSize: wp(5),
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    pieCenterLabel: {
        fontSize: wp(2.5),
        color: "#FFFFFF",
        opacity: 0.9,
    },
    pieLegend: {
        flexDirection: "row",
        justifyContent: "space-around",
        width: "100%",
        paddingHorizontal: wp(4),
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
    },
    legendColor: {
        width: wp(3),
        height: wp(3),
        borderRadius: wp(1.5),
        marginRight: wp(1),
    },
    legendText: {
        fontSize: wp(3),
        color: "#2C3E50",
        fontWeight: "500",
    },
    heatmapContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        marginHorizontal: wp(4),
        marginTop: hp(2),
        padding: wp(3),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    mapContainer: {
        height: hp(40),
        borderRadius: wp(2),
        overflow: "hidden",
        marginVertical: hp(1),
    },
    heatmap: {
        flex: 1,
    },
    heatmapDescription: {
        fontSize: wp(3),
        color: "#7F8C8D",
        textAlign: "center",
        marginTop: hp(1),
        lineHeight: wp(4),
    },
    motivationalCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        marginHorizontal: wp(4),
        marginTop: hp(2),
        padding: wp(4),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: "center",
    },
    motivationalTitle: {
        fontSize: wp(4.5),
        fontWeight: "bold",
        color: "#2C3E50",
        marginTop: hp(1),
        marginBottom: hp(0.5),
    },
    motivationalText: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        textAlign: "center",
        lineHeight: wp(5),
    },
    loadingContainer: {
        alignItems: "center",
        paddingVertical: hp(4),
    },
    loadingText: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        marginTop: hp(1),
    },
})

export default EstadisticasScreen
