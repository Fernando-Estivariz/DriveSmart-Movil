"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from "react-native"
import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin"
import Config from "react-native-config"

const { width } = Dimensions.get("window")

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current
    const googleButtonScale = useRef(new Animated.Value(1)).current

    // Configuración de Google Sign-In
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: "TU_CLIENT_ID_DE_WEB",
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
            Alert.alert("Error", "Por favor completa todos los campos")
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
                navigation.navigate("Home")
            }
        } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Error en la conexión")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        animateButton(googleButtonScale)

        try {
            await GoogleSignin.hasPlayServices()
            const userInfo = await GoogleSignin.signIn()
            const googleToken = userInfo.idToken

            const response = await axios.post(
                `${Config.API_URL}/google-login`,
                { token: googleToken },
                { headers: { "Content-Type": "application/json" } },
            )

            if (response.status === 200) {
                await AsyncStorage.setItem("authToken", response.data.token)
                navigation.navigate("Home")
            }
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                Alert.alert("Cancelado", "Inicio de sesión cancelado")
            } else {
                Alert.alert("Error", "No se pudo iniciar sesión con Google")
            }
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
})

export default LoginScreen
