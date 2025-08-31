"use client"

import { useEffect, useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
    ScrollView,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { GoogleSignin } from "@react-native-google-signin/google-signin"


const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const MenuScreen = ({ navigation }) => {
    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(-50)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const menuItemsAnim = useRef([]).current

    // Inicializar animaciones para cada item del menú
    const menuItems = [
        {
            id: 1,
            title: "Trazar Ruta",
            subtitle: "Planifica tu viaje",
            icon: "directions",
            color: "#FF6B35",
            bgColor: "#FFF5F2",
            onPress: () => navigation.navigate("Home"),
        },
        {
            id: 2,
            title: "Restricción de Placas",
            subtitle: "Consulta restricciones",
            icon: "no-crash",
            color: "#E74C3C",
            bgColor: "#FDEDEC",
            onPress: () => navigation.navigate("MapaPlacas"),
        },
        {
            id: 3,
            title: "Editar Perfil",
            subtitle: "Actualiza tu información",
            icon: "person",
            color: "#3498DB",
            bgColor: "#EBF5FF",
            onPress: () => navigation.navigate("EditProfileScreen"),
        },
        {
            id: 4,
            title: "Estacionamientos",
            subtitle: "Encuentra lugares para aparcar",
            icon: "local-parking",
            color: "#9B59B6",
            bgColor: "#F4ECF7",
            onPress: () => navigation.navigate("MapaEstacionamientos"),
        },
        {
            id: 5,
            title: "Cómo Usar la App",
            subtitle: "Guía de usuario",
            icon: "help-outline",
            color: "#F39C12",
            bgColor: "#FEF9E7",
            onPress: () => navigation.navigate("HowToUseScreen"),
        },
    ]

    // Inicializar animaciones para cada item
    if (menuItemsAnim.length === 0) {
        menuItems.forEach((_, index) => {
            menuItemsAnim.push(new Animated.Value(0))
        })
    }

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
            Animated.spring(logoScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start()

        // Animación escalonada de los items del menú
        const animations = menuItemsAnim.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            }),
        )

        Animated.stagger(100, animations).start()
    }, [])

    const animatePress = (callback) => {
        const scale = new Animated.Value(1)
        Animated.sequence([
            Animated.timing(scale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start()
        callback && callback()
    }

    const handleLogout = () => {
        animatePress(async () => {
            try {
                // Revocar + cerrar sesión de Google
                await GoogleSignin.revokeAccess().catch(() => { })
                await GoogleSignin.signOut().catch(() => { })
            } finally {
                // Borrar token local
                await AsyncStorage.removeItem("authToken")

                // Resetear navegación
                navigation.reset({
                    index: 0,
                    routes: [{ name: "LogingScreen" }], 
                })
            }
        })
    }

    const renderMenuItem = (item, index) => (
        <Animated.View
            key={item.id}
            style={[
                styles.menuItemContainer,
                {
                    opacity: menuItemsAnim[index],
                    transform: [
                        {
                            translateY: menuItemsAnim[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [30, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <TouchableOpacity style={styles.menuItem} onPress={() => animatePress(item.onPress)} activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                    <Icon name={item.icon} size={wp(6)} color={item.color} />
                </View>
                <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Icon name="chevron-right" size={wp(5)} color="#BDC3C7" />
            </TouchableOpacity>
        </Animated.View>
    )

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <Icon name="arrow-back" size={wp(6)} color="#2C3E50" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Menú Principal</Text>
                    <View style={styles.placeholder} />
                </Animated.View>

                {/* Profile Section */}
                <Animated.View
                    style={[
                        styles.profileSection,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: logoScale }],
                        },
                    ]}
                >
                    <Image source={require("../../assets/DRIVESMART.png")} style={styles.profileImage} />
                    <Text style={styles.welcomeText}>¡Bienvenido!</Text>
                    <Text style={styles.appName}>DriveSmart</Text>
                </Animated.View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Funciones Principales</Text>
                    {menuItems.slice(0, 4).map((item, index) => renderMenuItem(item, index))}
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Ayuda</Text>
                    {menuItems.slice(4).map((item, index) => renderMenuItem(item, index + 4))}
                </View>

                {/* 
                <Animated.View
                    style={[
                        styles.statsSection,
                        {
                            opacity: fadeAnim,
                        },
                    ]}
                >
                </Animated.View> 
                
                Stats Section */}

                {/* Logout Button */}
                <Animated.View
                    style={[
                        styles.logoutContainer,
                        {
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                        <Icon name="logout" size={wp(5)} color="#FFFFFF" />
                        <Text style={styles.logoutText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* App Version */}
                <Animated.View
                    style={[
                        styles.versionContainer,
                        {
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Text style={styles.versionText}>DriveSmart v1.0.0</Text>
                    <Text style={styles.copyrightText}>© 2024 Todos los derechos reservados</Text>
                </Animated.View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    scrollContent: {
        paddingBottom: hp(2),
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: wp(4),
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
    profileSection: {
        alignItems: "center",
        paddingVertical: hp(3),
        marginHorizontal: wp(4),
        backgroundColor: "#F8F9FA",
        borderRadius: wp(4),
        marginBottom: hp(3),
    },
    profileImage: {
        width: wp(20),
        height: wp(20),
        borderRadius: wp(10),
        marginBottom: hp(1),
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    welcomeText: {
        fontSize: wp(4.5),
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: 4,
    },
    appName: {
        fontSize: wp(3.5),
        color: "#FF6B35",
        fontWeight: "bold",
    },
    menuSection: {
        marginHorizontal: wp(4),
        marginBottom: hp(2),
    },
    sectionTitle: {
        fontSize: wp(4),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: hp(1.5),
        marginLeft: wp(1),
    },
    menuItemContainer: {
        marginBottom: hp(1),
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        padding: wp(4),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#F1F2F6",
    },
    iconContainer: {
        width: wp(12),
        height: wp(12),
        borderRadius: wp(6),
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp(3),
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: wp(4),
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
    },
    statsSection: {
        flexDirection: "row",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        padding: wp(4),
        marginHorizontal: wp(4),
        marginBottom: hp(3),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statDivider: {
        width: 1,
        backgroundColor: "#E1E8ED",
        marginHorizontal: wp(2),
    },
    statNumber: {
        fontSize: wp(5),
        fontWeight: "bold",
        color: "#2C3E50",
        marginTop: 4,
    },
    statLabel: {
        fontSize: wp(3),
        color: "#7F8C8D",
        marginTop: 2,
        textAlign: "center",
    },
    logoutContainer: {
        paddingHorizontal: wp(4),
        marginBottom: hp(2),
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E74C3C",
        borderRadius: wp(3),
        paddingVertical: hp(2),
        shadowColor: "#E74C3C",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    logoutText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
    versionContainer: {
        alignItems: "center",
        paddingHorizontal: wp(4),
        paddingBottom: hp(2),
    },
    versionText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        fontWeight: "500",
    },
    copyrightText: {
        fontSize: wp(2.8),
        color: "#BDC3C7",
        marginTop: 4,
    },
})

export default MenuScreen
