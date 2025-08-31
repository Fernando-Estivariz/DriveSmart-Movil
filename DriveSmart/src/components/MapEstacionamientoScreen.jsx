"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Dimensions } from "react-native"
import MapView, { Polyline } from "react-native-maps"
import axios from "axios"
import Config from "react-native-config"

const { width, height } = Dimensions.get("window")

const MapaEstacionamientos = ({ activeFilters }) => {
    const [allMapeados, setAllMapeados] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [mapReady, setMapReady] = useState(false)
    const [currentRegion, setCurrentRegion] = useState({
        latitude: -17.389468,
        longitude: -66.153868,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0121,
    })

    const mapRef = useRef(null)
    const regionChangeTimeoutRef = useRef(null)

    // Función para calcular si una línea intersecta con la región visible
    const lineIntersectsRegion = useCallback((latlngs, region) => {
        if (!latlngs || latlngs.length < 2) return false

        const { latitude, longitude, latitudeDelta, longitudeDelta } = region
        const buffer = 0.001 // Buffer para incluir líneas cercanas al borde

        const bounds = {
            north: latitude + latitudeDelta / 2 + buffer,
            south: latitude - latitudeDelta / 2 - buffer,
            east: longitude + longitudeDelta / 2 + buffer,
            west: longitude - longitudeDelta / 2 - buffer,
        }

        // Verificar si algún segmento de la línea intersecta con la región
        for (let i = 0; i < latlngs.length - 1; i++) {
            const [lat1, lng1] = latlngs[i]
            const [lat2, lng2] = latlngs[i + 1]

            // Verificar si algún punto del segmento está dentro de los bounds
            if (
                (lat1 >= bounds.south && lat1 <= bounds.north && lng1 >= bounds.west && lng1 <= bounds.east) ||
                (lat2 >= bounds.south && lat2 <= bounds.north && lng2 >= bounds.west && lng2 <= bounds.east)
            ) {
                return true
            }

            // Verificar intersección de línea con los bounds (algoritmo básico)
            if (
                (lat1 < bounds.south && lat2 > bounds.north) ||
                (lat1 > bounds.north && lat2 < bounds.south) ||
                (lng1 < bounds.west && lng2 > bounds.east) ||
                (lng1 > bounds.east && lng2 < bounds.west)
            ) {
                return true
            }
        }

        return false
    }, [])

    // Función optimizada para filtrar líneas visibles usando useMemo
    const visibleLines = useMemo(() => {
        if (!allMapeados.length || !mapReady) return []

        console.log(`🔍 Filtrando ${allMapeados.length} líneas para región actual...`)
        const startTime = performance.now()

        let filtered = allMapeados.filter((mapeado) => {
            return (
                mapeado.type === "polyline" &&
                mapeado.latlngs &&
                mapeado.latlngs.length > 1 &&
                lineIntersectsRegion(mapeado.latlngs, currentRegion)
            )
        })

        // Aplicar filtros de tipo si están activos
        if (activeFilters && activeFilters.length > 0) {
            filtered = filtered.filter((mapeado) => {
                return activeFilters.includes(mapeado.restriction)
            })
            console.log(`🎯 Filtros aplicados: ${activeFilters.join(", ")}`)
        }

        const endTime = performance.now()
        console.log(`✅ Filtrado completado en ${(endTime - startTime).toFixed(2)}ms - ${filtered.length} líneas visibles`)

        return filtered
    }, [allMapeados, currentRegion, mapReady, lineIntersectsRegion, activeFilters])

    // Función para obtener datos con estrategia de carga optimizada
    const fetchMapeados = useCallback(async () => {
        console.log("🚀 Iniciando carga de datos...")
        setLoading(true)
        setError(null)

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000)

            const startTime = performance.now()

            const response = await axios.get(`${Config.API_URL}/mapeado`, {
                headers: {
                    "Content-Type": "application/json",
                },
                signal: controller.signal,
                timeout: 25000,
            })

            clearTimeout(timeoutId)
            const endTime = performance.now()

            if (Array.isArray(response.data) && response.data.length > 0) {
                console.log(`📊 Datos cargados: ${response.data.length} elementos en ${(endTime - startTime).toFixed(2)}ms`)

                // Procesar y validar datos
                const validData = response.data.filter(
                    (item) => item.type === "polyline" && item.latlngs && Array.isArray(item.latlngs) && item.latlngs.length > 1,
                )

                console.log(`✅ Datos válidos: ${validData.length} líneas`)
                setAllMapeados(validData)
            } else {
                setError("No hay datos de estacionamientos disponibles")
            }
        } catch (error) {
            console.error("❌ Error al cargar datos:", error)
            if (error.name === "AbortError") {
                setError("Tiempo de espera agotado. Verifica tu conexión.")
            } else if (error.code === "ECONNABORTED") {
                setError("Conexión lenta. Intenta nuevamente.")
            } else if (error.response?.status === 404) {
                setError("Servicio no disponible temporalmente")
            } else {
                setError("Error de conexión. Verifica tu internet.")
            }
        } finally {
            setLoading(false)
        }
    }, [])

    // Manejo optimizado de cambios de región con debounce mínimo
    const handleRegionChange = useCallback((region) => {
        if (regionChangeTimeoutRef.current) {
            clearTimeout(regionChangeTimeoutRef.current)
        }

        // Debounce muy corto para mantener fluidez
        regionChangeTimeoutRef.current = setTimeout(() => {
            setCurrentRegion(region)
        }, 100)
    }, [])

    // Función para obtener estilo de línea optimizado
    const getLineStyle = useCallback((restriction) => {
        switch (restriction) {
            case "ESTACIONAMIENTO PROHIBIDO":
                return { color: "#E74C3C", width: 3 }
            case "ESTACIONAMIENTO TARIFADO":
                return { color: "#3498DB", width: 3 }
            case "ESTACIONAMIENTO TRANSPORTE PÚBLICO":
                return { color: "#9B59B6", width: 3 }
            case "ESTACIONAMIENTO PERSONAS CON DISCAPACIDAD":
                return { color: "#27AE60", width: 3 }
            case "ESTACIONAMIENTO DESCARGUE DE MERCADERÍA":
                return { color: "#F39C12", width: 3 }
            case "ESTACIONAMIENTO VEHÍCULOS OFICIALES":
                return { color: "#8E44AD", width: 3 }
            case "ESTACIONAMIENTO ESPECIAL VEHÍCULOS ELÉCTRICOS":
                return { color: "#1ABC9C", width: 3 }
            default:
                return { color: "#7F8C8D", width: 2 }
        }
    }, [])

    // Efectos
    useEffect(() => {
        fetchMapeados()

        return () => {
            if (regionChangeTimeoutRef.current) {
                clearTimeout(regionChangeTimeoutRef.current)
            }
        }
    }, [])

    // Función para reintentar
    const retryLoad = useCallback(() => {
        setError(null)
        fetchMapeados()
    }, [fetchMapeados])

    // Renderizado de estados de carga
    if (loading) {
        return (
            <View style={styles.container}>
                <MapView
                    style={styles.map}
                    initialRegion={currentRegion}
                    onMapReady={() => setMapReady(true)}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    loadingEnabled={true}
                />
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#FF6B35" />
                        <Text style={styles.loadingTitle}>Cargando Estacionamientos</Text>
                    </View>
                </View>
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.container}>
                <MapView
                    style={styles.map}
                    initialRegion={currentRegion}
                    onMapReady={() => setMapReady(true)}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                />
                <View style={styles.errorOverlay}>
                    <View style={styles.errorCard}>
                        <Text style={styles.errorIcon}>🚫</Text>
                        <Text style={styles.errorTitle}>Error de Carga</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
                            <Text style={styles.retryButtonText}>🔄 Reintentar Carga</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={currentRegion}
                onMapReady={() => setMapReady(true)}
                onRegionChangeComplete={handleRegionChange}
                showsUserLocation={true}
                showsMyLocationButton={false}
                loadingEnabled={false}
                maxZoomLevel={20}
                minZoomLevel={10}
                mapType="standard"
                showsTraffic={false}
                showsBuildings={false}
                showsIndoors={false}
                showsPointsOfInterest={false}
                rotateEnabled={true}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
            >
                {visibleLines.map((mapeado) => {
                    const style = getLineStyle(mapeado.restriction)
                    return (
                        <Polyline
                            key={`polyline-${mapeado.id}`}
                            coordinates={mapeado.latlngs.map((coord) => ({
                                latitude: coord[0],
                                longitude: coord[1],
                            }))}
                            strokeColor={style.color}
                            strokeWidth={style.width}
                            lineCap="round"
                            lineJoin="round"
                            geodesic={false}
                            zIndex={mapeado.restriction === "ESTACIONAMIENTO PROHIBIDO" ? 2 : 1}
                        />
                    )
                })}
            </MapView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    map: {
        flex: 1,
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(248, 249, 250, 0.98)",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 12,
        minWidth: width * 0.6,
    },
    loadingTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#2C3E50",
        marginTop: 20,
        textAlign: "center",
    },
    errorOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    errorCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 15,
        maxWidth: width * 0.9,
    },
    errorIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#E74C3C",
        marginBottom: 12,
        textAlign: "center",
    },
    errorText: {
        fontSize: 16,
        color: "#7F8C8D",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 24,
    },
    retryButton: {
        backgroundColor: "#FF6B35",
        borderRadius: 16,
        paddingHorizontal: 32,
        paddingVertical: 16,
        shadowColor: "#FF6B35",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
})

export default MapaEstacionamientos
