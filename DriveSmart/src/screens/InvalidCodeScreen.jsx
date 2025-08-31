"use client"

import { useRef, useState, useEffect } from "react"
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
import Config from "react-native-config"

const { width } = Dimensions.get("window")

const InvalidCodeScreen = ({ route, navigation }) => {
    const [code, setCode] = useState(["", "", "", ""])
    //const [receivedCode, setReceivedCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [timeLeft, setTimeLeft] = useState(60)
    const [attempts, setAttempts] = useState(0)
    const [error, setError] = useState("")
    const { nombre_completo, email, numberphone, placa, password } = route.params
    const maskEmail = (mail) => {
        
        const [user, domain] = mail.split("@")
        if (!user || !domain) return mail
        const userMasked = user.length <= 2 ? user[0] + "*" : user.slice(0,2) + "*".repeat(Math.max(1, user.length - 2))
        const [dom, tld] = domain.split(".")
        const domMasked = dom.length <= 1 ? dom : dom[0] + "*".repeat(Math.max(1, dom.length - 1))
        return `${userMasked}@${domMasked}.${tld || ""}`
    }


    // Referencias para cada cuadro de texto
    const inputRefs = useRef([])

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current
    const codeBoxAnimations = useRef(code.map(() => new Animated.Value(1))).current
    const errorShake = useRef(new Animated.Value(0)).current

    useEffect(() => {
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

        // autofocus primer input
        setTimeout(() => inputRefs.current[0]?.focus(), 300);

        // Timer para reenvío
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const animateCodeBox = (index) => {
        Animated.sequence([
            Animated.timing(codeBoxAnimations[index], {
                toValue: 1.1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(codeBoxAnimations[index], {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const animateButton = () => {
        Animated.sequence([
            Animated.timing(buttonScale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(buttonScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const animateError = () => {
        Animated.sequence([
            Animated.timing(errorShake, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(errorShake, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start()
    }

    const handleCodeChange = (value, index) => {
        const onlyDigit = value.replace(/[^0-9]/g, "")
        const newCode = [...code]
        newCode[index] = onlyDigit
        setCode(newCode)

        if (onlyDigit) {
            animateCodeBox(index)
        }

        // Limpiar error al escribir
        if (error) {
            setError("")
        }

        // Mover al siguiente cuadro de texto automáticamente
        if (onlyDigit && index < inputRefs.current.length - 1) {
            inputRefs.current[index + 1].focus()
        }

        // Auto-submit cuando se completa el código
        if (onlyDigit && index === 3) {
            const fullCode = newCode.join("")
            if (fullCode.length === 4) {
                setTimeout(() => handleSubmit(fullCode), 500)
            }
        }
    }

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1].focus()
        }
    }

    const handleSubmit = async (autoCode = null) => {
        const fullCode = autoCode || code.join("")

        if (fullCode.length !== 4) {
            setError("Por favor ingresa el código completo")
            animateError()
            return
        }

        setIsLoading(true)
        animateButton()

        try {
            const { data, status } = await axios.post(
                `${Config.API_URL}/auth/register/verify-otp`,
                { email, code: fullCode },
                { headers: { "Content-Type": "application/json" } },
            )

            if (status === 200 && data?.token) {
                await AsyncStorage.setItem("authToken", data.token)
                Alert.alert("🎉 ¡Éxito!", "Registro completado exitosamente", [
                    { text: "Continuar", onPress: () => navigation.navigate("SuccessScreen") },
                ])
            } else {
                setError(data?.message || "No se pudo verificar el código")
                animateError()
            }
        } catch (err) {
            const msg = err?.response?.data?.message || "Código inválido o expirado"
            setError(msg)
            animateError()

            setAttempts((prev) => {
                const next = prev + 1
                if (next >= 3) {
                    Alert.alert(
                        "❌ Demasiados Intentos",
                        "Has excedido el número máximo de intentos. Solicita un nuevo código.",
                        [
                            {
                                text: "Solicitar nuevo código",
                                onPress: () =>
                                    navigation.navigate("EnterCodeScreen", {
                                        nombre_completo: fullName,
                                        email,
                                        numberphone: phoneNumber,
                                        placa: plateNumber,
                                        password,
                                    }),
                            },
                        ],
                    )
                }
                return next
            })

            setCode(["", "", "", ""])
            inputRefs.current[0]?.focus()
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendCode = async () => {
        if (timeLeft > 0) return
        try {
            await axios.post(
                `${Config.API_URL}/auth/register/resend-otp`,
                { email },
                { headers: { "Content-Type": "application/json" } },
            )
            setTimeLeft(60)
            setAttempts(0)
            setError("")
            Alert.alert("📩 Código reenviado", "Revisa tu correo")
        } catch (err) {
            const msg = err?.response?.data?.message || "No se pudo reenviar el código"
            setError(msg)
            animateError()
        }
    }

    const formatPhoneNumber = (phone) => {
        if (phone.length > 6) {
            return `***-***-${phone.slice(-4)}`
        }
        return phone
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

                <View style={styles.headerContainer}>
                    <Text style={styles.title}>⚠️ Código Incorrecto</Text>
                    <Text style={styles.subtitle}>
                        Ingresa el nuevo código enviado a{"\n"}
                        <Text style={styles.phoneNumber}>{maskEmail(email)}</Text>
                    </Text>
                </View>

                <Animated.View style={[styles.codeContainer, { transform: [{ translateX: errorShake }] }]}>
                    {code.map((digit, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.codeInputContainer,
                                { transform: [{ scale: codeBoxAnimations[index] }] },
                                digit && styles.codeInputFilled,
                                error && styles.codeInputError,
                            ]}
                        >
                            <TextInput
                                style={[styles.codeInput, digit && styles.codeInputTextFilled]}
                                keyboardType="numeric"
                                maxLength={1}
                                value={digit}
                                onChangeText={(value) => handleCodeChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                ref={(el) => (inputRefs.current[index] = el)}
                                selectTextOnFocus
                            />
                        </Animated.View>
                    ))}
                </Animated.View>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.timerContainer}>
                    {timeLeft > 0 ? (
                        <Text style={styles.timerText}>
                            Reenviar código en <Text style={styles.timerNumber}>{timeLeft}s</Text>
                        </Text>
                    ) : (
                        <TouchableOpacity onPress={handleResendCode} activeOpacity={0.7}>
                            <Text style={styles.resendText}>Reenviar código</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={() => handleSubmit()}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>{isLoading ? "Verificando..." : "Verificar Código"}</Text>
                    </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity
                    onPress={() => navigation.navigate("EnterCodeScreen", route.params)}
                    style={styles.backContainer}
                    activeOpacity={0.7}
                >
                    <Text style={styles.backText}>← Volver a solicitar código</Text>
                </TouchableOpacity>

                <View style={styles.helpContainer}>
                    <Text style={styles.helpText}>
                        ¿Necesitas ayuda? Visita nuestro
                        <Text style={styles.helpLink}> centro de ayuda</Text>
                    </Text>
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
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
        paddingVertical: 40,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 30,
        borderRadius: 60,
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    headerContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#E74C3C",
        marginBottom: 12,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: "#7F8C8D",
        textAlign: "center",
        lineHeight: 22,
    },
    phoneNumber: {
        color: "#FF6B35",
        fontWeight: "bold",
    },
    codeContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 20,
        gap: 15,
    },
    codeInputContainer: {
        backgroundColor: "#F8F9FA",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#E1E8ED",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    codeInputFilled: {
        borderColor: "#FF6B35",
        backgroundColor: "#FFF5F2",
    },
    codeInputError: {
        borderColor: "#E74C3C",
        backgroundColor: "#FDEDEC",
    },
    codeInput: {
        width: 60,
        height: 60,
        textAlign: "center",
        fontSize: 24,
        fontWeight: "bold",
        color: "#2C3E50",
    },
    codeInputTextFilled: {
        color: "#FF6B35",
    },
    errorContainer: {
        backgroundColor: "#FDEDEC",
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: "#E74C3C",
    },
    errorText: {
        color: "#E74C3C",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    timerContainer: {
        marginBottom: 30,
        alignItems: "center",
    },
    timerText: {
        fontSize: 14,
        color: "#7F8C8D",
    },
    timerNumber: {
        color: "#FF6B35",
        fontWeight: "bold",
    },
    resendText: {
        fontSize: 16,
        color: "#FF6B35",
        fontWeight: "bold",
    },
    button: {
        width: width - 60,
        height: 55,
        backgroundColor: "#FF6B35",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
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
    backContainer: {
        marginTop: 25,
        paddingVertical: 10,
    },
    backText: {
        fontSize: 16,
        color: "#FF6B35",
        fontWeight: "600",
    },
    helpContainer: {
        marginTop: 20,
        paddingVertical: 10,
    },
    helpText: {
        fontSize: 14,
        color: "#7F8C8D",
        textAlign: "center",
    },
    helpLink: {
        color: "#FF6B35",
        fontWeight: "bold",
    },
})

export default InvalidCodeScreen
