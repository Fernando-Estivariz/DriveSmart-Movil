"use client"

import { useState } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
    StatusBar,
    ScrollView,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import MapEstacionamientos from "../components/MapEstacionamientoScreen"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const MapaEstacionamientos = ({ navigation }) => {
    const [isPanelExpanded, setIsPanelExpanded] = useState(true)
    const [selectedFilters, setSelectedFilters] = useState(["ALL"]) // Filtros seleccionados

    // Definición de tipos de estacionamiento
    const parkingTypes = [
        {
            id: "ALL",
            name: "Mostrar Todos",
            icon: "visibility",
            color: "#2C3E50",
            bgColor: "#F8F9FA",
            dbValue: null, // Para mostrar todos
        },
        {
            id: "PROHIBIDO",
            name: "Estacionamiento Prohibido",
            icon: "block",
            color: "#E74C3C",
            bgColor: "#FDEDEC",
            dbValue: "ESTACIONAMIENTO PROHIBIDO",
        },
        {
            id: "TARIFADO",
            name: "Estacionamiento Tarifado",
            icon: "local-parking",
            color: "#3498DB",
            bgColor: "#EBF5FF",
            dbValue: "ESTACIONAMIENTO TARIFADO",
        },
        {
            id: "TRANSPORTE",
            name: "Transporte Público",
            icon: "directions-bus",
            color: "#9B59B6",
            bgColor: "#F4ECF7",
            dbValue: "ESTACIONAMIENTO TRANSPORTE PÚBLICO",
        },
        {
            id: "DISCAPACIDAD",
            name: "Personas con Discapacidad",
            icon: "accessible",
            color: "#27AE60",
            bgColor: "#E8F5E8",
            dbValue: "ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD",
        },
        {
            id: "MERCADERIA",
            name: "Descargue de Mercadería",
            icon: "local-shipping",
            color: "#F39C12",
            bgColor: "#FEF9E7",
            dbValue: "ESTACIONAMIENTO DESCARGUE DE MERCADERÍA",
        },
        {
            id: "OFICIALES",
            name: "Vehículos Oficiales",
            icon: "star",
            color: "#8E44AD",
            bgColor: "#F4ECF7",
            dbValue: "ESTACIONAMIENTO VEHÍCULOS OFICIALES",
        },
        {
            id: "ELECTRICOS",
            name: "Vehículos Eléctricos",
            icon: "flash-on",
            color: "#1ABC9C",
            bgColor: "#E8F8F5",
            dbValue: "ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS",
        },
    ]

    const togglePanel = () => {
        setIsPanelExpanded(!isPanelExpanded)
    }

    const handleFilterToggle = (filterId) => {
        if (filterId === "ALL") {
            setSelectedFilters(["ALL"])
        } else {
            let newFilters = selectedFilters.filter((f) => f !== "ALL")

            if (newFilters.includes(filterId)) {
                newFilters = newFilters.filter((f) => f !== filterId)
            } else {
                newFilters.push(filterId)
            }

            // Si no hay filtros seleccionados, volver a "Mostrar Todos"
            if (newFilters.length === 0) {
                newFilters = ["ALL"]
            }

            setSelectedFilters(newFilters)
        }
    }

    const getActiveFilters = () => {
        if (selectedFilters.includes("ALL")) {
            return null // Mostrar todos
        }
        return parkingTypes
            .filter((type) => selectedFilters.includes(type.id))
            .map((type) => type.dbValue)
            .filter(Boolean)
    }

    const getSelectedCount = () => {
        if (selectedFilters.includes("ALL")) {
            return "Todos"
        }
        return selectedFilters.length
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Mapa principal */}
            <View style={styles.mapContainer}>
                <MapEstacionamientos activeFilters={getActiveFilters()} />
            </View>

            {/* Header flotante mejorado */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => navigation.navigate("MenuScreen")}
                    activeOpacity={0.8}
                >
                    <Icon name="menu" size={wp(6)} color="#FFFFFF" />
                </TouchableOpacity>

                <Image source={require("../../assets/DRIVESMART.png")} style={styles.logo} />
            </View>

            {/* Botón flotante cuando está colapsado */}
            {!isPanelExpanded && (
                <TouchableOpacity style={styles.floatingButton} onPress={togglePanel} activeOpacity={0.8}>
                    <Icon name="filter-list" size={wp(5)} color="#FFFFFF" />
                    <Text style={styles.floatingButtonText}>Filtros ({getSelectedCount()})</Text>
                </TouchableOpacity>
            )}

            {/* Panel de información mejorado */}
            <View style={[styles.descriptionContainer, { height: isPanelExpanded ? hp(50) : hp(10) }]}>
                {/* Header del panel */}
                <View style={styles.panelHeader}>
                    <View style={styles.titleSection}>
                        <Icon name="filter-list" size={wp(6)} color="#FF6B35" />
                        <View style={styles.titleTexts}>
                            <Text style={styles.descriptionTitle}>Filtros de Estacionamiento</Text>
                            <Text style={styles.subtitle}>Selecciona los tipos a mostrar</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.collapseButton} onPress={togglePanel} activeOpacity={0.7}>
                        <Icon name={isPanelExpanded ? "keyboard-arrow-down" : "keyboard-arrow-up"} size={wp(6)} color="#FF6B35" />
                    </TouchableOpacity>
                </View>

                {/* Contenido expandido */}
                {isPanelExpanded ? (
                    <ScrollView
                        style={styles.filterContainer}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.filterContent}
                    >
                        {/* Contador de filtros activos */}
                        <View style={styles.filterSummary}>
                            <Icon name="info-outline" size={wp(4)} color="#FF6B35" />
                            <Text style={styles.filterSummaryText}>
                                {selectedFilters.includes("ALL")
                                    ? "Mostrando todos los tipos de estacionamiento"
                                    : `${selectedFilters.length} tipo${selectedFilters.length > 1 ? "s" : ""} seleccionado${selectedFilters.length > 1 ? "s" : ""}`}
                            </Text>
                        </View>

                        {/* Lista de filtros */}
                        <Text style={styles.filterTitle}>Tipos de Estacionamiento</Text>

                        {parkingTypes.map((type) => {
                            const isSelected = selectedFilters.includes(type.id)
                            const isAll = type.id === "ALL"

                            return (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[styles.filterItem, isSelected && styles.filterItemSelected, isAll && styles.filterItemAll]}
                                    onPress={() => handleFilterToggle(type.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.filterIconContainer, { backgroundColor: type.bgColor }]}>
                                        <Icon name={type.icon} size={wp(5)} color={type.color} />
                                    </View>

                                    <View style={styles.filterTextContainer}>
                                        <Text style={[styles.filterName, isSelected && styles.filterNameSelected]}>{type.name}</Text>
                                    </View>

                                    <View style={styles.filterCheckContainer}>
                                        {isSelected ? (
                                            <Icon name="check-circle" size={wp(5)} color="#FF6B35" />
                                        ) : (
                                            <Icon name="radio-button-unchecked" size={wp(5)} color="#BDC3C7" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )
                        })}

                        {/* Botones de acción */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => setSelectedFilters(["ALL"])}
                                activeOpacity={0.8}
                            >
                                <Icon name="clear-all" size={wp(4)} color="#7F8C8D" />
                                <Text style={styles.clearButtonText}>Limpiar Filtros</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.applyButton} onPress={togglePanel} activeOpacity={0.8}>
                                <Icon name="check" size={wp(4)} color="#FFFFFF" />
                                <Text style={styles.applyButtonText}>Aplicar</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Información adicional */}
                        <View style={styles.infoContainer}>
                            <Icon name="lightbulb-outline" size={wp(4)} color="#F39C12" />
                            <Text style={styles.infoText}>
                                Los filtros se aplican en tiempo real. Las líneas se muestran según el área visible del mapa.
                            </Text>
                        </View>

                        {/* Horarios de restricción */}
                        <View style={styles.scheduleContainer}>
                            <View style={styles.scheduleHeader}>
                                <Icon name="schedule" size={wp(5)} color="#FF6B35" />
                                <Text style={styles.scheduleTitle}>Horarios de Restricción</Text>
                            </View>

                            <View style={styles.scheduleItem}>
                                <Text style={styles.scheduleDay}>Lunes a Viernes</Text>
                                <Text style={styles.scheduleTime}>07:00 - 19:00</Text>
                            </View>

                            <View style={styles.scheduleItem}>
                                <Text style={styles.scheduleDay}>Sábados</Text>
                                <Text style={styles.scheduleTime}>08:00 - 14:00</Text>
                            </View>

                            <View style={styles.scheduleItem}>
                                <Text style={styles.scheduleDay}>Domingos</Text>
                                <Text style={styles.scheduleTime}>Sin restricción</Text>
                            </View>
                        </View>
                    </ScrollView>
                ) : (
                    /* Contenido colapsado */
                    <View style={styles.collapsedContent}>
                        <View style={styles.dragIndicator} />
                        <View style={styles.collapsedInfo}>
                            <Text style={styles.collapsedText}>
                                Filtros: {getSelectedCount()} {selectedFilters.includes("ALL") ? "" : "activos"}
                            </Text>
                            <View style={styles.miniFilters}>
                                {selectedFilters.includes("ALL") ? (
                                    <View style={styles.miniFilterAll}>
                                        <Icon name="visibility" size={wp(3)} color="#2C3E50" />
                                    </View>
                                ) : (
                                    selectedFilters.slice(0, 3).map((filterId) => {
                                        const type = parkingTypes.find((t) => t.id === filterId)
                                        return (
                                            <View key={filterId} style={[styles.miniFilter, { backgroundColor: type.bgColor }]}>
                                                <Icon name={type.icon} size={wp(3)} color={type.color} />
                                            </View>
                                        )
                                    })
                                )}
                                {selectedFilters.length > 3 && !selectedFilters.includes("ALL") && (
                                    <Text style={styles.moreFilters}>+{selectedFilters.length - 3}</Text>
                                )}
                            </View>
                        </View>
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
        width: wp(12),
        height: wp(12),
        borderRadius: wp(6),
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
        paddingVertical: wp(2),
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
        fontSize: wp(3.2),
        fontWeight: "600",
        marginLeft: wp(1),
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
        padding: wp(4),
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    titleSection: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    titleTexts: {
        marginLeft: wp(3),
    },
    descriptionTitle: {
        fontSize: wp(4.5),
        fontWeight: "bold",
        color: "#2C3E50",
    },
    subtitle: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginTop: 2,
    },
    collapseButton: {
        padding: wp(1),
    },
    filterContainer: {
        flex: 1,
    },
    filterContent: {
        paddingHorizontal: wp(4),
        paddingBottom: wp(4),
    },
    filterSummary: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF5F2",
        borderRadius: wp(2),
        padding: wp(3),
        marginBottom: wp(3),
    },
    filterSummaryText: {
        fontSize: wp(3.2),
        color: "#FF6B35",
        marginLeft: wp(2),
        flex: 1,
        fontWeight: "500",
    },
    filterTitle: {
        fontSize: wp(3.8),
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: wp(2),
    },
    filterItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        padding: wp(3),
        marginBottom: wp(2),
        borderWidth: 2,
        borderColor: "transparent",
    },
    filterItemSelected: {
        backgroundColor: "#FFF5F2",
        borderColor: "#FF6B35",
    },
    filterItemAll: {
        backgroundColor: "#F1F2F6",
    },
    filterIconContainer: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp(3),
    },
    filterTextContainer: {
        flex: 1,
    },
    filterName: {
        fontSize: wp(3.5),
        fontWeight: "500",
        color: "#2C3E50",
    },
    filterNameSelected: {
        color: "#FF6B35",
        fontWeight: "600",
    },
    filterCheckContainer: {
        marginLeft: wp(2),
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: wp(3),
        marginBottom: wp(2),
        gap: wp(3),
    },
    clearButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(2),
        paddingVertical: wp(2.5),
        borderWidth: 1,
        borderColor: "#E1E8ED",
    },
    clearButtonText: {
        color: "#7F8C8D",
        fontSize: wp(3.2),
        fontWeight: "500",
        marginLeft: wp(1),
    },
    applyButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(2),
        paddingVertical: wp(2.5),
    },
    applyButtonText: {
        color: "#FFFFFF",
        fontSize: wp(3.2),
        fontWeight: "600",
        marginLeft: wp(1),
    },
    infoContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FEF9E7",
        borderRadius: wp(2),
        padding: wp(3),
        marginTop: wp(2),
    },
    infoText: {
        fontSize: wp(3),
        color: "#7F8C8D",
        marginLeft: wp(2),
        flex: 1,
        lineHeight: wp(4),
    },
    scheduleContainer: {
        backgroundColor: "#E8F4FD",
        borderRadius: wp(3),
        padding: wp(3),
        marginTop: wp(3),
    },
    scheduleHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: wp(2),
    },
    scheduleTitle: {
        fontSize: wp(3.8),
        fontWeight: "600",
        color: "#2C3E50",
        marginLeft: wp(2),
    },
    scheduleItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: wp(1),
        borderBottomWidth: 1,
        borderBottomColor: "rgba(127, 140, 141, 0.2)",
    },
    scheduleDay: {
        fontSize: wp(3.4),
        color: "#2C3E50",
        fontWeight: "500",
    },
    scheduleTime: {
        fontSize: wp(3.4),
        color: "#7F8C8D",
    },
    collapsedContent: {
        alignItems: "center",
        paddingVertical: wp(2),
    },
    dragIndicator: {
        width: wp(10),
        height: 4,
        backgroundColor: "#E1E8ED",
        borderRadius: 2,
        marginBottom: wp(2),
    },
    collapsedInfo: {
        alignItems: "center",
        width: "100%",
        paddingHorizontal: wp(4),
    },
    collapsedText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginBottom: wp(2),
    },
    miniFilters: {
        flexDirection: "row",
        alignItems: "center",
        gap: wp(1),
    },
    miniFilter: {
        width: wp(6),
        height: wp(6),
        borderRadius: wp(3),
        justifyContent: "center",
        alignItems: "center",
    },
    miniFilterAll: {
        width: wp(6),
        height: wp(6),
        borderRadius: wp(3),
        backgroundColor: "#F1F2F6",
        justifyContent: "center",
        alignItems: "center",
    },
    moreFilters: {
        fontSize: wp(2.8),
        color: "#7F8C8D",
        marginLeft: wp(1),
    },
})

export default MapaEstacionamientos
