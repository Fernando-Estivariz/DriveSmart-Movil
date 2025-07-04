"use client"

import { useEffect, useRef } from "react"
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import MapScreen from "../components/MapScreen"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const Home = ({ navigation }) => {
    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(100)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const menuScale = useRef(new Animated.Value(0.8)).current

    useEffect(() => {
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
            Animated.spring(menuScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start()
    }, [])

    const handleSearchPress = () => {
        navigation.navigate("SearchScreen")
    }

    const handleLocationPress = (type) => {
        navigation.navigate("SearchScreen", { locationType: type })
    }

    const handleMenuPress = () => {
        navigation.navigate("MenuScreen")
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Mapa de fondo */}
            <MapScreen />

            {/* Header con menú y logo */}
            <View style={styles.header}>
                <Animated.View style={{ transform: [{ scale: menuScale }] }}>
                    <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress} activeOpacity={0.8}>
                        <Icon name="menu" size={wp(6)} color="#2C3E50" />
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                    <Image source={require("../../assets/DRIVESMART.png")} style={styles.logo} />
                </Animated.View>
            </View>

            {/* Contenedor de búsqueda compacto */}
            <Animated.View
                style={[
                    styles.searchContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideUpAnim }],
                    },
                ]}
            >
                {/* Caja de búsqueda principal */}
                <TouchableOpacity style={styles.searchBox} onPress={handleSearchPress} activeOpacity={0.9}>
                    <View style={styles.searchIconContainer}>
                        <Icon name="search" size={wp(5)} color="#FF6B35" />
                    </View>
                    <View style={styles.searchInputContainer}>
                        <Text style={styles.searchPlaceholder}>¿Adónde vas?</Text>
                        <Text style={styles.searchSubtext}>Buscar destino</Text>
                    </View>
                    <View style={styles.voiceIconContainer}>
                        <Icon name="keyboard-voice" size={wp(5)} color="#7F8C8D" />
                    </View>
                </TouchableOpacity>

                {/* Accesos rápidos compactos */}
                <View style={styles.locationContainer}>
                    <TouchableOpacity style={styles.locationItem} onPress={() => handleLocationPress("home")} activeOpacity={0.7}>
                        <View style={[styles.locationIconContainer, { backgroundColor: "#E8F5E8" }]}>
                            <Icon name="home" size={wp(4)} color="#4CAF50" />
                        </View>
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationText}>Casa</Text>
                            <Text style={styles.locationSubtext}>Ir a casa</Text>
                        </View>
                        <Icon name="chevron-right" size={wp(4)} color="#BDC3C7" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.locationItem} onPress={() => handleLocationPress("work")} activeOpacity={0.7}>
                        <View style={[styles.locationIconContainer, { backgroundColor: "#FFF3E0" }]}>
                            <Icon name="work" size={wp(4)} color="#FF9800" />
                        </View>
                        <View style={styles.locationTextContainer}>
                            <Text style={styles.locationText}>Trabajo</Text>
                            <Text style={styles.locationSubtext}>Ir al trabajo</Text>
                        </View>
                        <Icon name="chevron-right" size={wp(4)} color="#BDC3C7" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "relative",
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
    searchContainer: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? hp(4) : hp(2.5),
        left: wp(4),
        right: wp(4),
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        padding: wp(3),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(2.5),
        padding: wp(3),
        borderWidth: 1,
        borderColor: "#E1E8ED",
        marginBottom: wp(2),
    },
    searchIconContainer: {
        marginRight: wp(2.5),
    },
    searchInputContainer: {
        flex: 1,
    },
    searchPlaceholder: {
        fontSize: wp(3.8),
        color: "#2C3E50",
        fontWeight: "600",
    },
    searchSubtext: {
        fontSize: wp(3),
        color: "#7F8C8D",
        marginTop: 1,
    },
    voiceIconContainer: {
        marginLeft: wp(2.5),
    },
    locationContainer: {
        gap: wp(1),
    },
    locationItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: wp(2),
        paddingHorizontal: wp(1),
        borderRadius: wp(1.5),
    },
    locationIconContainer: {
        width: wp(7),
        height: wp(7),
        borderRadius: wp(3.5),
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp(2.5),
    },
    locationTextContainer: {
        flex: 1,
    },
    locationText: {
        fontSize: wp(3.5),
        color: "#2C3E50",
        fontWeight: "600",
    },
    locationSubtext: {
        fontSize: wp(2.8),
        color: "#7F8C8D",
        marginTop: 1,
    },
})

export default Home
