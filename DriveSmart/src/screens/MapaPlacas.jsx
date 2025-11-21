"use client"

import { useState } from "react"
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    Platform,
    StatusBar,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import MapPlacas from "../components/MapPlacasScreen"

const { width, height } = Dimensions.get("window")

const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100
const isSmallDevice = width < 375
const isMediumDevice = width >= 375 && width < 414

const MapaPlacas = ({ navigation }) => {
    const [isPanelExpanded, setIsPanelExpanded] = useState(true)

    // Función para obtener el día actual y su restricción
    const getCurrentDayRestriction = () => {
        const today = new Date().getDay() // 0 = Domingo, 1 = Lunes, etc.
        const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
        const restrictions = {
            Lunes: { numbers: "0 y 1", image: require("../../assets/0y1.png") },
            Martes: { numbers: "2 y 3", image: require("../../assets/2y3.png") },
            Miércoles: { numbers: "4 y 5", image: require("../../assets/4y5.png") },
            Jueves: { numbers: "6 y 7", image: require("../../assets/6y7.png") },
            Viernes: { numbers: "8 y 9", image: require("../../assets/8y9.png") },
        }

        const currentDay = days[today]
        return {
            day: currentDay,
            restriction: restrictions[currentDay] || null,
        }
    }

    const currentDay = getCurrentDayRestriction()

    const togglePanel = () => {
        setIsPanelExpanded(!isPanelExpanded)
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Mapa principal */}
            <View style={styles.mapContainer}>
                <MapPlacas />
            </View>

            {/* Header flotante mejorado */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => navigation.navigate("MenuScreen")}
                    activeOpacity={0.8}
                >
                    <Icon name="menu" size={wp(6.5)} color="#FFFFFF" />
                </TouchableOpacity>

                <Image source={require("../../assets/DRIVESMART.png")} style={styles.logo} />
            </View>

            {/* Botón flotante cuando está colapsado */}
            {!isPanelExpanded && (
                <TouchableOpacity style={styles.floatingButton} onPress={togglePanel} activeOpacity={0.8}>
                    <Icon name="info" size={wp(5)} color="#FFFFFF" />
                    <Text style={styles.floatingButtonText}>Restricciones</Text>
                </TouchableOpacity>
            )}

            {/* Panel de información mejorado */}
            <View style={[styles.descriptionContainer, { height: isPanelExpanded ? hp(38) : hp(10) }]}>
                {/* Header del panel con botón de colapsar */}
                <View style={styles.panelHeader}>
                    <View style={styles.titleSection}>
                        <Icon name="no-crash" size={isSmallDevice ? wp(5.5) : wp(6)} color="#FF6B35" />
                        <View style={styles.titleTexts}>
                            <Text style={styles.title}>Restricción Vehicular</Text>
                            <Text style={styles.subTitle}>Último Número de la Placa</Text>
                        </View>
                    </View>

                    <View style={styles.headerActions}>
                        <View style={styles.timeContainer}>
                            <Icon name="schedule" size={isSmallDevice ? wp(3.5) : wp(4)} color="#FF6B35" />
                            <Text style={styles.time}>07:00 - 19:00</Text>
                        </View>
                        <TouchableOpacity style={styles.collapseButton} onPress={togglePanel} activeOpacity={0.7}>
                            <Icon
                                name={isPanelExpanded ? "keyboard-arrow-down" : "keyboard-arrow-up"}
                                size={wp(6.5)}
                                color="#FF6B35"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Contenido expandido */}
                {isPanelExpanded ? (
                    <>
                        {/* Restricción actual destacada */}
                        {currentDay.restriction && (
                            <View style={styles.currentRestrictionContainer}>
                                <View style={styles.currentRestrictionHeader}>
                                    <Icon name="today" size={isSmallDevice ? wp(4.5) : wp(5)} color="#FF6B35" />
                                    <Text style={styles.currentRestrictionTitle}>Hoy - {currentDay.day}</Text>
                                </View>
                                <View style={styles.currentRestrictionContent}>
                                    <Text style={styles.currentRestrictionText}>Placas: {currentDay.restriction.numbers}</Text>
                                    <Image source={currentDay.restriction.image} style={styles.currentPlateImage} />
                                </View>
                            </View>
                        )}

                        {/* Lista de todos los días */}
                        <View style={styles.weeklyContainer}>
                            <Text style={styles.weeklyTitle}>Calendario Semanal</Text>
                            <ScrollView
                                style={styles.scrollView}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {/* Lunes */}
                                <View style={[styles.infoRow, currentDay.day === "Lunes" && styles.currentDayRow]}>
                                    <View style={styles.dayContainer}>
                                        <Text style={[styles.dayText, currentDay.day === "Lunes" && styles.currentDayText]}>Lunes</Text>
                                        {currentDay.day === "Lunes" && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayText}>HOY</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.terminacionText}>Terminación 0 y 1</Text>
                                    <Image source={require("../../assets/0y1.png")} style={styles.placaSmall0y1} />
                                </View>

                                {/* Martes */}
                                <View style={[styles.infoRow, currentDay.day === "Martes" && styles.currentDayRow]}>
                                    <View style={styles.dayContainer}>
                                        <Text style={[styles.dayText, currentDay.day === "Martes" && styles.currentDayText]}>Martes</Text>
                                        {currentDay.day === "Martes" && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayText}>HOY</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.terminacionText}>Terminación 2 y 3</Text>
                                    <Image source={require("../../assets/2y3.png")} style={styles.placaSmall} />
                                </View>

                                {/* Miércoles */}
                                <View style={[styles.infoRow, currentDay.day === "Miércoles" && styles.currentDayRow]}>
                                    <View style={styles.dayContainer}>
                                        <Text style={[styles.dayText, currentDay.day === "Miércoles" && styles.currentDayText]}>
                                            Miércoles
                                        </Text>
                                        {currentDay.day === "Miércoles" && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayText}>HOY</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.terminacionText}>Terminación 4 y 5</Text>
                                    <Image source={require("../../assets/4y5.png")} style={styles.placaSmall} />
                                </View>

                                {/* Jueves */}
                                <View style={[styles.infoRow, currentDay.day === "Jueves" && styles.currentDayRow]}>
                                    <View style={styles.dayContainer}>
                                        <Text style={[styles.dayText, currentDay.day === "Jueves" && styles.currentDayText]}>Jueves</Text>
                                        {currentDay.day === "Jueves" && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayText}>HOY</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.terminacionText}>Terminación 6 y 7</Text>
                                    <Image source={require("../../assets/6y7.png")} style={styles.placaSmall} />
                                </View>

                                {/* Viernes */}
                                <View style={[styles.infoRow, currentDay.day === "Viernes" && styles.currentDayRow]}>
                                    <View style={styles.dayContainer}>
                                        <Text style={[styles.dayText, currentDay.day === "Viernes" && styles.currentDayText]}>Viernes</Text>
                                        {currentDay.day === "Viernes" && (
                                            <View style={styles.todayBadge}>
                                                <Text style={styles.todayText}>HOY</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.terminacionText}>Terminación 8 y 9</Text>
                                    <Image source={require("../../assets/8y9.png")} style={styles.placaSmall} />
                                </View>
                            </ScrollView>
                        </View>
                    </>
                ) : (
                    /* Contenido colapsado */
                    <View style={styles.collapsedContent}>
                        <View style={styles.dragIndicator} />
                        {currentDay.restriction && (
                            <View style={styles.collapsedInfo}>
                                <Text style={styles.collapsedDayText}>{currentDay.day}</Text>
                                <Text style={styles.collapsedRestrictionText}>Restricción: {currentDay.restriction.numbers}</Text>
                                <Image source={currentDay.restriction.image} style={styles.collapsedPlateImage} />
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    mapContainer: {
        flex: 1,
    },
    header: {
        position: "absolute",
        top: Platform.OS === "ios" ? hp(5.5) : hp(3.5),
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
        padding: wp(2.5),
    },
    logo: {
        width: wp(11),
        height: wp(11),
        borderRadius: wp(5.5),
    },
    floatingButton: {
        position: "absolute",
        bottom: hp(13),
        right: wp(4),
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(6),
        paddingHorizontal: wp(4),
        paddingVertical: wp(2.5),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 5,
    },
    floatingButtonText: {
        color: "#FFFFFF",
        fontSize: isSmallDevice ? wp(3) : wp(3.2),
        fontWeight: "600",
        marginLeft: wp(1.5),
    },
    descriptionContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: wp(5),
        borderTopRightRadius: wp(5),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    panelHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: wp(3.5),
        paddingVertical: wp(2.5),
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    titleSection: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: wp(2),
    },
    titleTexts: {
        marginLeft: wp(2),
        flex: 1,
    },
    title: {
        fontSize: isSmallDevice ? wp(3.8) : wp(4.2),
        fontWeight: "bold",
        color: "#2C3E50",
    },
    subTitle: {
        fontSize: isSmallDevice ? wp(2.8) : wp(3),
        color: "#7F8C8D",
        marginTop: 2,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: wp(1.5),
    },
    timeContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF5F2",
        borderRadius: wp(1.5),
        paddingHorizontal: wp(2),
        paddingVertical: wp(1),
    },
    time: {
        fontSize: isSmallDevice ? wp(2.8) : wp(3),
        color: "#FF6B35",
        fontWeight: "600",
        marginLeft: wp(0.5),
    },
    collapseButton: {
        padding: wp(0.5),
    },
    currentRestrictionContainer: {
        backgroundColor: "#FFF5F2",
        marginHorizontal: wp(3.5),
        marginTop: wp(2.5),
        marginBottom: wp(2),
        borderRadius: wp(2.5),
        padding: wp(2.5),
        borderLeftWidth: 3,
        borderLeftColor: "#FF6B35",
    },
    currentRestrictionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: wp(2),
    },
    currentRestrictionTitle: {
        fontSize: isSmallDevice ? wp(3.5) : wp(3.8),
        fontWeight: "bold",
        color: "#FF6B35",
        marginLeft: wp(1.5),
    },
    currentRestrictionContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    currentRestrictionText: {
        fontSize: isSmallDevice ? wp(3.2) : wp(3.5),
        color: "#2C3E50",
        flex: 1,
        fontWeight: "600",
    },
    currentPlateImage: {
        width: isSmallDevice ? wp(16) : wp(18),
        height: isSmallDevice ? wp(6.5) : wp(7.5),
        resizeMode: "contain",
    },
    weeklyContainer: {
        flex: 1,
        paddingHorizontal: wp(3.5),
        paddingBottom: wp(1),
    },
    weeklyTitle: {
        fontSize: isSmallDevice ? wp(3.5) : wp(3.8),
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: wp(1.5),
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: wp(2),
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(2.5),
        paddingVertical: wp(2),
        paddingHorizontal: wp(2.5),
        marginBottom: wp(1.5),
        borderWidth: 1,
        borderColor: "#E1E8ED",
    },
    currentDayRow: {
        backgroundColor: "#FFF5F2",
        borderColor: "#FF6B35",
        borderWidth: 1.5,
    },
    dayContainer: {
        width: isSmallDevice ? wp(16) : wp(18),
        alignItems: "flex-start",
    },
    dayText: {
        fontSize: isSmallDevice ? wp(3.2) : wp(3.5),
        fontWeight: "600",
        color: "#2C3E50",
    },
    currentDayText: {
        color: "#FF6B35",
    },
    todayBadge: {
        backgroundColor: "#FF6B35",
        borderRadius: wp(1),
        paddingHorizontal: wp(1.5),
        paddingVertical: wp(0.5),
        marginTop: 2,
    },
    todayText: {
        fontSize: wp(2.2),
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    terminacionText: {
        fontSize: isSmallDevice ? wp(2.8) : wp(3),
        color: "#7F8C8D",
        flex: 1,
        marginLeft: wp(1),
    },
    placaSmall: {
        width: isSmallDevice ? wp(15) : wp(16),
        height: isSmallDevice ? wp(6) : wp(6.5),
        resizeMode: "contain",
    },
    placaSmall0y1: {
        width: isSmallDevice ? wp(15) : wp(16),
        height: isSmallDevice ? wp(7.5) : wp(8),
        resizeMode: "contain",
    },
    collapsedContent: {
        alignItems: "center",
        paddingVertical: wp(1.5),
    },
    dragIndicator: {
        width: wp(10),
        height: 3,
        backgroundColor: "#E1E8ED",
        borderRadius: 2,
        marginBottom: wp(1.5),
    },
    collapsedInfo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: wp(4),
    },
    collapsedDayText: {
        fontSize: isSmallDevice ? wp(3.5) : wp(3.8),
        fontWeight: "bold",
        color: "#FF6B35",
    },
    collapsedRestrictionText: {
        fontSize: isSmallDevice ? wp(2.8) : wp(3.2),
        color: "#7F8C8D",
        flex: 1,
        marginLeft: wp(2),
    },
    collapsedPlateImage: {
        width: isSmallDevice ? wp(13) : wp(15),
        height: isSmallDevice ? wp(5) : wp(6),
        resizeMode: "contain",
    },
})

export default MapaPlacas
