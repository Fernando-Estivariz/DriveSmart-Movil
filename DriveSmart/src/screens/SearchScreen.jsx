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
    const [error, setError] = useState(null)
    const [retryCount, setRetryCount] = useState(0)
    const navigation = useNavigation()

    const searchTimeoutRef = useRef(null)
    const retryTimeoutRef = useRef(null)

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

    const fetchWithTimeout = async (url, timeout = 10000) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                },
            })
            clearTimeout(timeoutId)
            return response
        } catch (error) {
            clearTimeout(timeoutId)
            if (error.name === "AbortError") {
                const timeoutError = new Error("La solicitud tardó demasiado tiempo. Verifica tu conexión a Internet.")
                timeoutError.code = "TIMEOUT"
                throw timeoutError
            }
            if (
                !error.message ||
                error.message.includes("Network request failed") ||
                error.message.includes("Failed to fetch")
            ) {
                const networkError = new Error("Sin conexión a Internet. Por favor, verifica tu conexión.")
                networkError.code = "NETWORK_ERROR"
                throw networkError
            }
            throw error
        }
    }

    const handleApiError = (error, context = "búsqueda") => {
        console.error(`[Error en ${context}]:`, error)

        if (error.code === "TIMEOUT") {
            return {
                message: "La solicitud tardó demasiado tiempo. Verifica tu conexión a Internet.",
                canRetry: true,
                severity: "warning",
            }
        }

        if (error.code === "NETWORK_ERROR") {
            return {
                message: "Sin conexión a Internet. Por favor, verifica tu conexión.",
                canRetry: true,
                severity: "error",
            }
        }

        if (error.message?.includes("401") || error.message?.includes("403")) {
            return {
                message: "Error de autenticación. Contacta con soporte técnico.",
                canRetry: false,
                severity: "error",
            }
        }

        if (error.message?.includes("429")) {
            return {
                message: "Demasiadas solicitudes. Espera un momento e intenta nuevamente.",
                canRetry: true,
                severity: "warning",
            }
        }

        if (error.message?.includes("500") || error.message?.includes("502") || error.message?.includes("503")) {
            return {
                message: "El servicio no está disponible temporalmente. Intenta nuevamente en unos momentos.",
                canRetry: true,
                severity: "warning",
            }
        }

        return {
            message: "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
            canRetry: true,
            severity: "error",
        }
    }

    const searchPlaces = async (query, isRetry = false) => {
        if (query.length === 0) {
            setPlaces([])
            setSelectedPlace(null)
            setError(null)
            setRetryCount(0)
            return
        }

        setIsLoading(true)
        if (!isRetry) {
            setError(null)
            setRetryCount(0)
        }

        try {
            const response = await fetchWithTimeout(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=-17.3895,-66.1568&radius=30000&strictbounds=true&components=country:bo&language=es&key=${Config.GOOGLE_PLACES_API_KEY}`,
                10000,
            )

            if (!response.ok) {
                const errorMsg = new Error(`Error del servidor: ${response.status}`)
                errorMsg.code = `HTTP_${response.status}`
                throw errorMsg
            }

            const data = await response.json()

            if (data.status === "ZERO_RESULTS") {
                setPlaces([])
                setError({
                    message: "No se encontraron resultados en Cochabamba. Intenta con otro término.",
                    canRetry: false,
                    severity: "info",
                })
            } else if (data.status === "REQUEST_DENIED") {
                setPlaces([])
                setError({
                    message: "Error de configuración del servicio. Contacta con soporte técnico.",
                    canRetry: false,
                    severity: "error",
                })
            } else if (data.status === "INVALID_REQUEST") {
                setPlaces([])
                setError({
                    message: "Búsqueda inválida. Por favor, intenta con otro término.",
                    canRetry: false,
                    severity: "warning",
                })
            } else if (data.status === "OVER_QUERY_LIMIT") {
                setPlaces([])
                setError({
                    message: "Límite de búsquedas alcanzado. Intenta nuevamente en unos momentos.",
                    canRetry: true,
                    severity: "warning",
                })
            } else if (data.predictions && data.predictions.length > 0) {
                const cochabambaResults = data.predictions.filter((place) => {
                    const description = place.description.toLowerCase()
                    return (
                        description.includes("cochabamba") ||
                        description.includes("cercado") ||
                        description.includes("quillacollo") ||
                        description.includes("sacaba") ||
                        description.includes("colcapirhua") ||
                        description.includes("tiquipaya") ||
                        description.includes("vinto") ||
                        description.includes("sipe sipe")
                    )
                })

                if (cochabambaResults.length > 0) {
                    setPlaces(cochabambaResults)
                    setError(null)
                    setRetryCount(0)
                    Animated.timing(listAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start()
                } else {
                    setPlaces([])
                    setError({
                        message: "No se encontraron resultados en Cochabamba. Intenta con otro término.",
                        canRetry: false,
                        severity: "info",
                    })
                }
            } else {
                setPlaces([])
                setError({
                    message: "No se encontraron lugares. Intenta con otro término de búsqueda.",
                    canRetry: false,
                    severity: "info",
                })
            }
        } catch (error) {
            const errorInfo = handleApiError(error, "búsqueda de lugares")
            setPlaces([])
            setError(errorInfo)

            if (errorInfo.canRetry && errorInfo.code === "NETWORK_ERROR" && retryCount < 2 && !isRetry) {
                setRetryCount((prev) => prev + 1)
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current)
                }
                retryTimeoutRef.current = setTimeout(() => {
                    searchPlaces(query, true)
                }, 2000)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const getPlaceDetails = async (placeId) => {
        try {
            setError(null)

            const response = await fetchWithTimeout(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&language=es&key=${Config.GOOGLE_PLACES_API_KEY}`,
                10000,
            )

            if (!response.ok) {
                const errorMsg = new Error(`Error del servidor: ${response.status}`)
                errorMsg.code = `HTTP_${response.status}`
                throw errorMsg
            }

            const data = await response.json()

            if (data.status === "OK" && data.result?.geometry?.location) {
                return data.result.geometry.location
            } else {
                throw new Error(`No se pudieron obtener los detalles del lugar. Estado: ${data.status}`)
            }
        } catch (error) {
            const errorInfo = handleApiError(error, "detalles del lugar")
            setError(errorInfo)
            return null
        }
    }

    const handlePlaceSelect = async (place) => {
        setSearchQuery(place.description)
        setPlaces([])
        setIsLoading(true)
        setError(null)

        const location = await getPlaceDetails(place.place_id)
        if (location) {
            setSelectedPlace({
                description: place.description,
                latitude: location.lat,
                longitude: location.lng,
            })
            setError(null)
        } else {
            setSearchQuery("")
            setSelectedPlace(null)
        }
        setIsLoading(false)
    }

    const handleConfirmLocation = () => {
        if (selectedPlace) {
            navigation.navigate("ConfirmarRecorridoScreen", {
                destinationLocation: selectedPlace,
            })
        } else {
            setError({
                message: "Por favor, selecciona una ubicación antes de confirmar.",
                canRetry: false,
                severity: "warning",
            })
        }
    }

    const handleSearch = (text) => {
        setSearchQuery(text)
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
        }
        setRetryCount(0)
        searchTimeoutRef.current = setTimeout(() => {
            searchPlaces(text)
        }, 500)
    }

    const handleManualRetry = () => {
        setError(null)
        setRetryCount(0)
        if (searchQuery.length > 0) {
            searchPlaces(searchQuery)
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
                                setError(null)
                                if (searchTimeoutRef.current) {
                                    clearTimeout(searchTimeoutRef.current)
                                }
                                if (retryTimeoutRef.current) {
                                    clearTimeout(retryTimeoutRef.current)
                                }
                                setRetryCount(0)
                            }}
                        >
                            <Icon name="close-circle" size={wp(5)} color="#7F8C8D" />
                        </TouchableOpacity>
                    )}
                </View>

                {error && !isLoading && (
                    <View
                        style={[
                            styles.errorContainer,
                            error.severity === "error" && styles.errorContainerError,
                            error.severity === "warning" && styles.errorContainerWarning,
                            error.severity === "info" && styles.errorContainerInfo,
                        ]}
                    >
                        <Icon
                            name={
                                error.severity === "error" ? "error" : error.severity === "warning" ? "warning" : "information-circle"
                            }
                            size={wp(5)}
                            color={error.severity === "error" ? "#E74C3C" : error.severity === "warning" ? "#F39C12" : "#3498DB"}
                        />
                        <Text
                            style={[
                                styles.errorText,
                                error.severity === "error" && styles.errorTextError,
                                error.severity === "warning" && styles.errorTextWarning,
                                error.severity === "info" && styles.errorTextInfo,
                            ]}
                        >
                            {error.message}
                        </Text>
                        {error.canRetry && (
                            <TouchableOpacity style={styles.retryButton} onPress={handleManualRetry} activeOpacity={0.7}>
                                <Icon name="refresh" size={wp(4)} color="#FF6B35" />
                                <Text style={styles.retryText}>Reintentar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Lugares recientes */}
                {places.length === 0 && !isLoading && !error && searchQuery.length === 0 && (
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
    errorContainer: {
        backgroundColor: "#FFEBEE",
        borderRadius: wp(3),
        padding: wp(3),
        marginBottom: hp(2),
        flexDirection: "row",
        alignItems: "center",
        borderLeftWidth: 4,
        borderLeftColor: "#E74C3C",
    },
    errorContainerError: {
        backgroundColor: "#FFEBEE",
        borderLeftColor: "#E74C3C",
    },
    errorContainerWarning: {
        backgroundColor: "#FFF3E0",
        borderLeftColor: "#F39C12",
    },
    errorContainerInfo: {
        backgroundColor: "#E3F2FD",
        borderLeftColor: "#3498DB",
    },
    errorText: {
        flex: 1,
        fontSize: wp(3.5),
        color: "#C0392B",
        marginLeft: wp(2),
        fontWeight: "500",
    },
    errorTextError: {
        color: "#C0392B",
    },
    errorTextWarning: {
        color: "#E67E22",
    },
    errorTextInfo: {
        color: "#2980B9",
    },
    retryButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: wp(3),
        paddingVertical: wp(1.5),
        borderRadius: wp(2),
        marginLeft: wp(2),
    },
    retryText: {
        fontSize: wp(3.2),
        color: "#FF6B35",
        fontWeight: "600",
        marginLeft: wp(1),
    },
})

export default SearchScreen
