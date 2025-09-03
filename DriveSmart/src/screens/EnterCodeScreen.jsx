"use client"

import { useRef, useState, useEffect } from "react"
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
import Config from "react-native-config"

const { width } = Dimensions.get("window")

const EnterCodeScreen = ({ route, navigation }) => {
    const [code, setCode] = useState(["", "", "", ""])
    const [isLoading, setIsLoading] = useState(false)
    const [timeLeft, setTimeLeft] = useState(60)
    const { fullName, email, phoneNumber, plateNumber, password } = route.params

    // Estados para modales
    const [showModal, setShowModal] = useState(false)
    const [modalConfig, setModalConfig] = useState({
        type: "error", // 'error', 'success', 'info'
        title: "",
        message: "",
        buttons: [],
    })

    const maskEmail = (mail) => {
        const [user, domain] = mail.split("@")
        if (!user || !domain) return mail
        const userMasked = user.length <= 2 ? user[0] + "*" : user.slice(0, 2) + "*".repeat(Math.max(1, user.length - 2))
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
    const modalAnim = useRef(new Animated.Value(0)).current
    const modalSlideAnim = useRef(new Animated.Value(50)).current

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
        setTimeout(() => inputRefs.current[0]?.focus(), 300)

        // Timer para reenvío
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    // Función para mostrar modal personalizado
    const showCustomModal = (type, title, message, buttons = []) => {
        setModalConfig({ type, title, message, buttons })
        setShowModal(true)

        // Animación del modal
        Animated.parallel([
            Animated.timing(modalAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(modalSlideAnim, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const hideModal = () => {
        Animated.parallel([
            Animated.timing(modalAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(modalSlideAnim, {
                toValue: 50,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowModal(false)
            setModalConfig({ type: "error", title: "", message: "", buttons: [] })
        })
    }

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

    const handleCodeChange = (value, index) => {
        const onlyDigit = value.replace(/[^0-9]/g, "")
        const newCode = [...code]
        newCode[index] = onlyDigit
        setCode(newCode)

        if (onlyDigit) {
            animateCodeBox(index)
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
            showCustomModal("error", "Código Incompleto", "Por favor ingresa el código completo de 4 dígitos.", [
                {
                    text: "Entendido",
                    onPress: () => {
                        hideModal()
                        inputRefs.current[0]?.focus()
                    },
                },
            ])
            return
        }

        setIsLoading(true)
        animateButton()

        try {
            // 1) Verificar OTP en backend
            const verifyRes = await axios.post(
                `${Config.API_URL}/auth/register/verify-otp`,
                { email, code: fullCode },
                { headers: { "Content-Type": "application/json" } },
            )

            // 2) Si tu backend aún NO crea al usuario en verify-otp, registra aquí:
            if (verifyRes?.data?.needRegister === true) {
                await axios.post(
                    `${Config.API_URL}/register`,
                    {
                        nombre_completo: fullName,
                        email,
                        numberphone: phoneNumber,
                        placa: plateNumber,
                        password,
                    },
                    { headers: { "Content-Type": "application/json" } },
                )
            }

            // 3) Si el backend devuelve token al verificar, lo guardamos
            if (verifyRes?.data?.token) {
                await AsyncStorage.setItem("authToken", verifyRes.data.token)
            }

            showCustomModal(
                "success",
                "🎉 ¡Registro Exitoso!",
                "Tu cuenta ha sido verificada y creada exitosamente. ¡Bienvenido a DriveSmart!",
                [
                    {
                        text: "Continuar",
                        onPress: () => {
                            hideModal()
                            navigation.navigate("SuccessScreen")
                        },
                    },
                ],
            )
        } catch (err) {
            // Shake animation para error
            Animated.sequence([
                Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start()

            const msg = err?.response?.data?.message || "Código inválido o expirado"
            showCustomModal("error", "Código Incorrecto", msg, [
                {
                    text: "Volver a intentar",
                    onPress: () => {
                        hideModal()
                        setCode(["", "", "", ""])
                        inputRefs.current[0]?.focus()
                    },
                },
            ])
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
            showCustomModal(
                "success",
                "Código Reenviado",
                "Se ha enviado un nuevo código de verificación a tu correo electrónico.",
                [
                    {
                        text: "Perfecto",
                        onPress: () => hideModal(),
                    },
                ],
            )
        } catch (err) {
            const msg = err?.response?.data?.message || "No se pudo reenviar el código"
            showCustomModal("error", "Error al Reenviar", msg, [
                {
                    text: "Entendido",
                    onPress: () => hideModal(),
                },
            ])
        }
    }

    const getModalIcon = () => {
        switch (modalConfig.type) {
            case "success":
                return "✅"
            case "error":
                return "❌"
            case "info":
                return "ℹ️"
            default:
                return "⚠️"
        }
    }

    const getModalColors = () => {
        switch (modalConfig.type) {
            case "success":
                return {
                    iconBg: "#E8F5E8",
                    iconColor: "#4CAF50",
                    buttonBg: "#4CAF50",
                }
            case "error":
                return {
                    iconBg: "#FFEBEE",
                    iconColor: "#F44336",
                    buttonBg: "#F44336",
                }
            case "info":
                return {
                    iconBg: "#E3F2FD",
                    iconColor: "#2196F3",
                    buttonBg: "#2196F3",
                }
            default:
                return {
                    iconBg: "#FFF3E0",
                    iconColor: "#FF9800",
                    buttonBg: "#FF9800",
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

                <Text style={styles.title}>Verificación de Código</Text>
                <Text style={styles.subtitle}>
                    Hemos enviado un código de 4 dígitos a{"\n"}
                    <Text style={styles.emailText}>{maskEmail(email)}</Text>
                </Text>

                <View style={styles.codeContainer}>
                    {code.map((digit, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.codeInputContainer,
                                { transform: [{ scale: codeBoxAnimations[index] }] },
                                digit && styles.codeInputFilled,
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
                </View>

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

                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backContainer} activeOpacity={0.7}>
                    <Text style={styles.backText}>← Cambiar correo electrónico</Text>
                </TouchableOpacity>

                <View style={styles.helpContainer}>
                    <Text style={styles.helpText}>
                        ¿Necesitas ayuda? Visita nuestro
                        <Text style={styles.helpLink}> centro de ayuda</Text>
                    </Text>
                </View>
            </Animated.View>

            {/* Modal Personalizado */}
            <Modal visible={showModal} transparent={true} animationType="none" onRequestClose={hideModal}>
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            {
                                opacity: modalAnim,
                                transform: [{ translateY: modalSlideAnim }],
                            },
                        ]}
                    >
                        <View style={[styles.modalIconContainer, { backgroundColor: getModalColors().iconBg }]}>
                            <Text style={[styles.modalIcon, { color: getModalColors().iconColor }]}>{getModalIcon()}</Text>
                        </View>

                        <Text style={styles.modalTitle}>{modalConfig.title}</Text>
                        <Text style={styles.modalMessage}>{modalConfig.message}</Text>

                        <View style={styles.modalButtonContainer}>
                            {modalConfig.buttons.map((button, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.modalButton, { backgroundColor: getModalColors().buttonBg }]}
                                    onPress={button.onPress}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.modalButtonText}>{button.text}</Text>
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
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: 12,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: "#7F8C8D",
        marginBottom: 40,
        textAlign: "center",
        lineHeight: 22,
    },
    emailText: {
        color: "#FF6B35",
        fontWeight: "bold",
    },
    codeContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 30,
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
    // Estilos del Modal
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
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
        maxWidth: width - 40,
        width: "100%",
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
        fontWeight: "bold",
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#2C3E50",
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
        width: "100%",
        gap: 10,
    },
    modalButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: "center",
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
    modalButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
})

export default EnterCodeScreen
