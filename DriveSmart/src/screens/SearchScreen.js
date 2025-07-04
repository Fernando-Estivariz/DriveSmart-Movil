"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from "react-native"
import Icon from "react-native-vector-icons/Ionicons"
import { useNavigation } from "@react-navigation/native"
import Config from "react-native-config"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const SearchScreen = () => {
    const [searchQuery, setSearchQuery] = useState("")
    const [places, setPlaces] = useState([])
    const [selectedPlace, setSelectedPlace] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const navigation = useNavigation()

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(-50)).current
    const listAnim = useRef(new Animated.Value(0)).current


    useEffect(() => {
        // Animación de entrada
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start()
    }, [])

    // Función para buscar lugares
    const searchPlaces = async (query) => {
        if (query.length > 0) {
            setIsLoading(true)
            try {
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&location=-17.3895,-66.1568&radius=50000&components=country:bo&language=es&key=${Config.GOOGLE_PLACES_API_KEY}`,
                )
                const data = await response.json()
                console.log("API Response:", data)

                if (data.predictions) {
                    setPlaces(data.predictions)
                    // Animar la lista cuando aparecen resultados
                    Animated.timing(listAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start()
                } else {
                    setPlaces([])
                }
            } catch (error) {
                console.error("Error fetching places: ", error)
                setPlaces([])
            } finally {
                setIsLoading(false)
            }
        } else {
            setPlaces([])
            setSelectedPlace(null)
        }
    }

    const handleSearch = (query) => {
        setSearchQuery(query)
        searchPlaces(query)
    }

    // Obtener detalles del lugar
    const getPlaceDetails = async (placeId) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${Config.GOOGLE_PLACES_API_KEY}`,
            )
            const data = await response.json()
            return data.result.geometry.location
        } catch (error) {
            console.error("Error fetching place details: ", error)
            return null
        }
    }

    // Manejar selección de lugar
    const handlePlaceSelect = async (place) => {
        setSearchQuery(place.description)
        setPlaces([])
        setIsLoading(true)

        const location = await getPlaceDetails(place.place_id)
        if (location) {
            setSelectedPlace({
                description: place.description,
                latitude: location.lat,
                longitude: location.lng,
            })
        }
        setIsLoading(false)
    }

    // Confirmar ubicación
    const handleConfirmLocation = () => {
        if (selectedPlace) {
            navigation.navigate("ConfirmarRecorridoScreen", {
                destinationLocation: selectedPlace,
            })
        } else {
            alert("Por favor, selecciona una ubicación antes de confirmar.")
        }
    }

    const renderPlace = ({ item, index }) => (
        <Animated.View
            style={[
                styles.listItemContainer,
                {
                    opacity: listAnim,
                    transform: [
                        {
                            translateY: listAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <TouchableOpacity style={styles.listItem} onPress={() => handlePlaceSelect(item)} activeOpacity={0.7}>
                <View style={styles.iconContainer}>
                    <Icon name="location-outline" size={wp(5)} color="#FF6B35" />
                </View>
                <View style={styles.placeInfo}>
                    <Text style={styles.placeName} numberOfLines={2}>
                        {item.description}
                    </Text>
                    <Text style={styles.placeType}>{item.types?.[0]?.replace(/_/g, " ") || "Lugar"}</Text>
                </View>
                <Icon name="chevron-forward-outline" size={wp(4)} color="#BDC3C7" />
            </TouchableOpacity>
        </Animated.View>
    )

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <Icon name="arrow-back" size={wp(6)} color="#2C3E50" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>¿Adónde vas?</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Ubicación actual */}
                <View style={styles.currentLocationContainer}>
                    <View style={styles.currentLocationItem}>
                        <View style={styles.currentLocationIcon}>
                            <Icon name="radio-button-on-outline" size={wp(5)} color="#4CAF50" />
                        </View>
                        <Text style={styles.currentLocationText}>Tu ubicación actual</Text>
                    </View>
                </View>

                {/* Barra de búsqueda */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchIconContainer}>
                        <Icon name="search" size={wp(5)} color="#FF6B35" />
                    </View>
                    <TextInput
                        placeholder="Buscar destino..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholderTextColor="#7F8C8D"
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => {
                                setSearchQuery("")
                                setPlaces([])
                                setSelectedPlace(null)
                            }}
                        >
                            <Icon name="close-circle" size={wp(5)} color="#7F8C8D" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Lugares recientes */}
                {places.length === 0 && !isLoading && (
                    <TouchableOpacity style={styles.recentButton} activeOpacity={0.7}>
                        <View style={styles.recentIconContainer}>
                            <Icon name="time-outline" size={wp(5)} color="#7F8C8D" />
                        </View>
                        <Text style={styles.recentText}>Lugares recientes</Text>
                        <Icon name="chevron-down-outline" size={wp(4)} color="#7F8C8D" />
                    </TouchableOpacity>
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Buscando lugares...</Text>
                    </View>
                )}

                {/* Lista de resultados */}
                {places.length > 0 && (
                    <View style={styles.resultsContainer}>
                        <Text style={styles.resultsTitle}>Resultados de búsqueda</Text>
                        <FlatList
                            data={places}
                            keyExtractor={(item) => item.place_id}
                            renderItem={renderPlace}
                            style={styles.list}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>
                )}

                {/* Botones de acción */}
                <View style={styles.actionButtonsContainer}>
                    {selectedPlace && (
                        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmLocation} activeOpacity={0.8}>
                            <Icon name="checkmark-circle" size={wp(5)} color="#FFFFFF" />
                            <Text style={styles.confirmButtonText}>Confirmar Destino</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => navigation.navigate("SeleccionarUbicacionScreen")}
                        activeOpacity={0.8}
                    >
                        <Icon name="map" size={wp(5)} color="#FF6B35" />
                        <Text style={styles.mapButtonText}>Seleccionar en Mapa</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        flex: 1,
        paddingHorizontal: wp(4),
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: Platform.OS === "ios" ? hp(6) : hp(4),
        paddingBottom: hp(2),
    },
    backButton: {
        padding: wp(2),
    },
    headerTitle: {
        fontSize: wp(5),
        fontWeight: "bold",
        color: "#2C3E50",
    },
    placeholder: {
        width: wp(10),
    },
    currentLocationContainer: {
        marginBottom: hp(2),
    },
    currentLocationItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        padding: wp(3),
        borderWidth: 1,
        borderColor: "#E1E8ED",
    },
    currentLocationIcon: {
        marginRight: wp(3),
    },
    currentLocationText: {
        fontSize: wp(4),
        color: "#2C3E50",
        fontWeight: "500",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        paddingHorizontal: wp(3),
        marginBottom: hp(2),
        borderWidth: 2,
        borderColor: "#E1E8ED",
    },
    searchIconContainer: {
        marginRight: wp(2),
    },
    searchInput: {
        flex: 1,
        height: hp(6),
        fontSize: wp(4),
        color: "#2C3E50",
    },
    clearButton: {
        padding: wp(1),
    },
    recentButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: hp(2),
        paddingHorizontal: wp(2),
    },
    recentIconContainer: {
        marginRight: wp(3),
    },
    recentText: {
        flex: 1,
        fontSize: wp(4),
        color: "#7F8C8D",
        fontWeight: "500",
    },
    loadingContainer: {
        paddingVertical: hp(3),
        alignItems: "center",
    },
    loadingText: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
    },
    resultsContainer: {
        flex: 1,
    },
    resultsTitle: {
        fontSize: wp(3.8),
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: hp(1),
    },
    list: {
        flex: 1,
    },
    listItemContainer: {
        marginBottom: hp(0.5),
    },
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(2),
        borderRadius: wp(2),
        backgroundColor: "#FAFBFC",
    },
    iconContainer: {
        marginRight: wp(3),
    },
    placeInfo: {
        flex: 1,
    },
    placeName: {
        fontSize: wp(3.8),
        color: "#2C3E50",
        fontWeight: "500",
        lineHeight: wp(5),
    },
    placeType: {
        fontSize: wp(3),
        color: "#7F8C8D",
        marginTop: 2,
        textTransform: "capitalize",
    },
    actionButtonsContainer: {
        paddingVertical: hp(2),
        gap: hp(1.5),
    },
    confirmButton: {
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
    confirmButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
    mapButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        paddingVertical: hp(1.8),
        borderWidth: 2,
        borderColor: "#FF6B35",
    },
    mapButtonText: {
        color: "#FF6B35",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
})

export default SearchScreen
