"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from "react-native"
import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin"
import Config from "react-native-config"

const { width, height } = Dimensions.get("window")

// --- Cliente axios con baseURL y token automático en headers
const api = axios.create({
    baseURL: Config.API_URL,
    headers: { "Content-Type": "application/json" },
})
api.interceptors.request.use(async (cfg) => {
    const tk = await AsyncStorage.getItem("authToken")
    if (tk) cfg.headers.Authorization = `Bearer ${tk}`
    return cfg
})

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Estados para modales personalizados
    const [modalVisible, setModalVisible] = useState(false)
    const [modalConfig, setModalConfig] = useState({
        type: "error", // 'error', 'success', 'info', 'confirm'
        title: "",
        message: "",
        buttons: [],
    })

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current
    const googleButtonScale = useRef(new Animated.Value(1)).current
    const modalScale = useRef(new Animated.Value(0.8)).current
    const modalOpacity = useRef(new Animated.Value(0)).current

    // Funciones para mostrar modales
    const showCustomAlert = (type, title, message, buttons = [{ text: "OK", onPress: () => hideModal() }]) => {
        setModalConfig({ type, title, message, buttons })
        setModalVisible(true)

        // Animación de entrada del modal
        Animated.parallel([
            Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(modalScale, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const hideModal = () => {
        Animated.parallel([
            Animated.timing(modalOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(modalScale, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setModalVisible(false)
        })
    }

    // Configuración de Google Sign-In
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: Config.GOOGLE_WEB_CLIENT_ID,
            scopes: ["openid", "email", "profile"],
            offlineAccess: false,
        })

        // Animación de entrada
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
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
        ]).start()
            ; (async () => {
                const token = await AsyncStorage.getItem("authToken")
                if (token) navigation.replace("Home")
            })()
    }, [])

    const animateButton = (scaleRef) => {
        Animated.sequence([
            Animated.timing(scaleRef, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleRef, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            showCustomAlert("error", "Campos requeridos", "Por favor completa todos los campos para continuar")
            return
        }

        setIsLoading(true)
        animateButton(buttonScale)

        try {
            console.log("api url", Config.API_URL)
            const response = await axios.post(
                `${Config.API_URL}/login`,
                { email: username, password: password },
                { headers: { "Content-Type": "application/json" } },
            )

            if (response.status === 200) {
                const token = response.data.token
                console.log("Inicio de sesión exitoso:", token)

                await AsyncStorage.setItem("authToken", token)
                // Navegar directamente sin mostrar modal de éxito
                navigation.navigate("Home")
            }
        } catch (error) {
            showCustomAlert("error", "Error de autenticación", error.response?.data?.message || "Error en la conexión")
        } finally {
            setIsLoading(false)
        }
    }

    // --- Login con Google (valida que el email exista en la BD)
    const handleGoogleSignIn = async () => {
        animateButton(googleButtonScale)
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })

            // Opcional la primera vez para "resetear" cualquier sesión
            await GoogleSignin.signOut().catch(() => { })
            await GoogleSignin.revokeAccess().catch(() => { })

            const info = await GoogleSignin.signIn()
            // NO toques info.idToken; usa una variable nueva
            let tokenFromGoogle = info?.idToken

            // Fallback: si no vino en signIn(), pide los tokens
            if (!tokenFromGoogle) {
                const tokens = await GoogleSignin.getTokens() // { idToken, accessToken }
                tokenFromGoogle = tokens?.idToken
            }

            if (!tokenFromGoogle) {
                const tokens = await GoogleSignin.getTokens().catch(() => null)

                showCustomAlert("error", "Error de autenticación", "No se obtuvo el token de Google")
                return
            }

            // Enviar al backend
            const { data, status } = await api.post("/auth/google", {
                idToken: tokenFromGoogle,
                allowCreate: false,
            })

            if (status === 200 && data?.token) {
                await AsyncStorage.setItem("authToken", data.token)
                // Navegar directamente sin mostrar modal de éxito
                navigation.replace("Home")
            } else {
                showCustomAlert("error", "Error de autenticación", data?.message || "No autorizado")
            }
        } catch (error) {
            console.log("Google Sign-In Error:", error)

            // Manejo específico de errores de Google Sign-In
            if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
                showCustomAlert("info", "Cancelado", "Inicio de sesión cancelado por el usuario")
            } else if (error?.code === statusCodes.IN_PROGRESS) {
                showCustomAlert("info", "En progreso", "La autenticación ya está en progreso")
            } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                showCustomAlert("error", "Servicios no disponibles", "Google Play Services no está disponible o actualizado")
            }
            // Manejo específico de errores del backend
            else if (error?.response) {
                const { status, data } = error.response

                if (status === 400 || status === 404) {
                    // Usuario no registrado
                    showCustomAlert(
                        "confirm",
                        "Cuenta no encontrada",
                        "No encontramos una cuenta registrada con este email de Google. ¿Te gustaría crear una cuenta nueva?",
                        [
                            {
                                text: "Cancelar",
                                onPress: () => hideModal(),
                                style: "cancel",
                            },
                            {
                                text: "Registrarse",
                                onPress: () => {
                                    hideModal()
                                    navigation.navigate("RegisterScreen")
                                },
                            },
                        ],
                    )
                } else if (status === 401) {
                    showCustomAlert("error", "No autorizado", "No tienes permisos para acceder. Verifica tu cuenta.")
                } else if (status === 500) {
                    showCustomAlert(
                        "error",
                        "Error del servidor",
                        "Hubo un problema en nuestros servidores. Por favor intenta más tarde.",
                    )
                } else {
                    showCustomAlert("error", "Error", data?.message || "Error desconocido del servidor")
                }
            }
            // Error de red o conexión
            else if (error?.code === "NETWORK_ERROR" || error?.message?.includes("Network")) {
                showCustomAlert("error", "Sin conexión", "Verifica tu conexión a internet e intenta nuevamente")
            }
            // Error genérico
            else {
                showCustomAlert("error", "Error inesperado", "No se pudo iniciar sesión con Google. Intenta nuevamente.")
            }
        }
    }

    // Función para obtener el icono según el tipo
    const getModalIcon = (type) => {
        switch (type) {
            case "error":
                return "❌"
            case "success":
                return "✅"
            case "info":
                return "ℹ️"
            case "confirm":
                return "❓"
            default:
                return "ℹ️"
        }
    }

    // Función para obtener el color según el tipo
    const getModalColor = (type) => {
        switch (type) {
            case "error":
                return "#FF4757"
            case "success":
                return "#2ED573"
            case "info":
                return "#3742FA"
            case "confirm":
                return "#FF6B35"
            default:
                return "#3742FA"
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                    <Image source={require("../../assets/DRIVESMART.png")} style={styles.logo} />
                </Animated.View>

                <Text style={styles.title}>¡Bienvenido de vuelta!</Text>
                <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Correo electrónico"
                        placeholderTextColor="#999"
                        value={username}
                        onChangeText={setUsername}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>{isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}</Text>
                    </TouchableOpacity>
                </Animated.View>

                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>O continúa con</Text>
                    <View style={styles.divider} />
                </View>

                <Animated.View style={{ transform: [{ scale: googleButtonScale }] }}>
                    <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} activeOpacity={0.8}>
                        <Image source={require("../../assets/logoGoogle.png")} style={styles.socialIcon} />
                        <Text style={styles.googleButtonText}>Continuar con Google</Text>
                    </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity
                    onPress={() => navigation.navigate("RegisterScreen")}
                    style={styles.registerContainer}
                    activeOpacity={0.7}
                >
                    <Text style={styles.registerText}>
                        ¿No tienes una cuenta?
                        <Text style={styles.registerLink}> Regístrate aquí</Text>
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Modal personalizado */}
            <Modal visible={modalVisible} transparent={true} animationType="none" onRequestClose={hideModal}>
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            {
                                opacity: modalOpacity,
                                transform: [{ scale: modalScale }],
                            },
                        ]}
                    >
                        {/* Icono */}
                        <View style={[styles.modalIconContainer, { backgroundColor: getModalColor(modalConfig.type) + "20" }]}>
                            <Text style={styles.modalIcon}>{getModalIcon(modalConfig.type)}</Text>
                        </View>

                        {/* Título */}
                        <Text style={[styles.modalTitle, { color: getModalColor(modalConfig.type) }]}>{modalConfig.title}</Text>

                        {/* Mensaje */}
                        <Text style={styles.modalMessage}>{modalConfig.message}</Text>

                        {/* Botones */}
                        <View style={styles.modalButtonContainer}>
                            {modalConfig.buttons.map((button, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.modalButton,
                                        button.style === "cancel" ? styles.modalButtonCancel : styles.modalButtonPrimary,
                                        { backgroundColor: button.style === "cancel" ? "#F1F2F6" : getModalColor(modalConfig.type) },
                                    ]}
                                    onPress={button.onPress}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.modalButtonText, { color: button.style === "cancel" ? "#2C3E50" : "#FFFFFF" }]}>
                                        {button.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
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
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
        paddingVertical: 20,
    },
    logo: {
        width: 160,
        height: 160,
        marginBottom: 20,
        borderRadius: 80,
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: "#7F8C8D",
        marginBottom: 40,
        textAlign: "center",
    },
    inputContainer: {
        width: "100%",
        marginBottom: 20,
    },
    input: {
        width: "100%",
        height: 55,
        backgroundColor: "#F8F9FA",
        borderRadius: 12,
        paddingHorizontal: 20,
        fontSize: 16,
        color: "#2C3E50",
        borderWidth: 2,
        borderColor: "transparent",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    button: {
        width: width - 60,
        height: 55,
        backgroundColor: "#FF6B35",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        marginTop: 10,
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonDisabled: {
        backgroundColor: "#FFB399",
        shadowOpacity: 0.1,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 30,
        width: "100%",
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#E1E8ED",
    },
    dividerText: {
        marginHorizontal: 15,
        fontSize: 14,
        color: "#7F8C8D",
        fontWeight: "500",
    },
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderColor: "#E1E8ED",
        borderWidth: 2,
        borderRadius: 12,
        paddingVertical: 15,
        paddingHorizontal: 20,
        width: width - 60,
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    socialIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    googleButtonText: {
        color: "#2C3E50",
        fontSize: 16,
        fontWeight: "600",
    },
    registerContainer: {
        marginTop: 30,
        paddingVertical: 10,
    },
    registerText: {
        fontSize: 16,
        color: "#7F8C8D",
        textAlign: "center",
    },
    registerLink: {
        color: "#FF6B35",
        fontWeight: "bold",
    },
    // Estilos del modal personalizado
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 30,
        alignItems: "center",
        maxWidth: width - 40,
        width: "100%",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    modalIcon: {
        fontSize: 40,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 15,
    },
    modalMessage: {
        fontSize: 16,
        color: "#7F8C8D",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 30,
    },
    modalButtonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        gap: 15,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modalButtonPrimary: {
        // Color se asigna dinámicamente
    },
    modalButtonCancel: {
        backgroundColor: "#F1F2F6",
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
})

export default LoginScreen
