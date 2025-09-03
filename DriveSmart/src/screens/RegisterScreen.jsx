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
    ScrollView,
    Modal,
} from "react-native"
import axios from "axios"
import Config from "react-native-config"
import CountryPicker from "../components/CountryPicker"

const { width } = Dimensions.get("window")

const RegisterScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [countryCode, setCountryCode] = useState("+591")
    const [plateNumber, setPlateNumber] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [modalVisible, setModalVisible] = useState(false)
    const [modalConfig, setModalConfig] = useState({
        title: "",
        message: "",
        icon: "",
        color: "",
        buttons: [],
    })

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current
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
    }, [])

    const showModal = (config) => {
        setModalConfig(config)
        setModalVisible(true)
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
            setModalVisible(false)
            modalSlideAnim.setValue(50)
        })
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

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    const validateBolivianPlate = (plate) => {
        // Formato boliviano: 4 dígitos + 3 letras (ej: 1234ABC)
        const bolivianPlateRegex = /^[0-9]{4}[A-Z]{3}$/
        return bolivianPlateRegex.test(plate)
    }

    const formatPlateNumber = (text) => {
        // Convertir a mayúsculas y remover caracteres no válidos
        const cleaned = text.toUpperCase().replace(/[^0-9A-Z]/g, "")

        // Limitar a 7 caracteres máximo
        if (cleaned.length > 7) return plateNumber

        // Formatear: primeros 4 deben ser números, siguientes 3 letras
        let formatted = ""
        for (let i = 0; i < cleaned.length; i++) {
            if (i < 4) {
                // Primeros 4 caracteres deben ser números
                if (/[0-9]/.test(cleaned[i])) {
                    formatted += cleaned[i]
                }
            } else {
                // Siguientes 3 caracteres deben ser letras
                if (/[A-Z]/.test(cleaned[i])) {
                    formatted += cleaned[i]
                }
            }
        }

        return formatted
    }

    const handlePlateChange = (text) => {
        const formatted = formatPlateNumber(text)
        setPlateNumber(formatted)
    }

    const handleRegister = async () => {
        // Validación de campos vacíos
        if (!fullName || !email || !phoneNumber || !plateNumber || !password || !confirmPassword) {
            showModal({
                title: "Campos Incompletos",
                message: "Por favor, completa todos los campos para continuar",
                icon: "⚠️",
                color: "#FFA726",
                buttons: [
                    {
                        text: "Entendido",
                        onPress: hideModal,
                        style: "primary",
                    },
                ],
            })
            return
        }

        // Validación de formato de correo electrónico
        if (!validateEmail(email)) {
            showModal({
                title: "Email Inválido",
                message: "Por favor, introduce un correo electrónico válido",
                icon: "📧",
                color: "#FF5722",
                buttons: [
                    {
                        text: "Corregir",
                        onPress: hideModal,
                        style: "primary",
                    },
                ],
            })
            return
        }

        // Validación de formato de placa boliviana
        if (!validateBolivianPlate(plateNumber)) {
            showModal({
                title: "Placa Inválida",
                message: "La placa debe tener el formato boliviano: 4 números seguidos de 3 letras (ej: 1234ABC)",
                icon: "🚗",
                color: "#FF5722",
                buttons: [
                    {
                        text: "Corregir",
                        onPress: hideModal,
                        style: "primary",
                    },
                ],
            })
            return
        }

        // Validación de contraseña
        if (password.length < 6) {
            showModal({
                title: "Contraseña Débil",
                message: "La contraseña debe tener al menos 6 caracteres para mayor seguridad",
                icon: "🔒",
                color: "#FF5722",
                buttons: [
                    {
                        text: "Corregir",
                        onPress: hideModal,
                        style: "primary",
                    },
                ],
            })
            return
        }

        // Validación de confirmación de contraseña
        if (password !== confirmPassword) {
            showModal({
                title: "Contraseñas No Coinciden",
                message: "Las contraseñas ingresadas no son iguales. Por favor, verifícalas",
                icon: "🔐",
                color: "#FF5722",
                buttons: [
                    {
                        text: "Corregir",
                        onPress: hideModal,
                        style: "primary",
                    },
                ],
            })
            return
        }

        setIsLoading(true)
        animateButton()

        // Preparación del número de teléfono
        const sanitizedPhoneNumber = `${countryCode}${phoneNumber}`.replace("+", "")

        try {
            await axios.post(
                `${Config.API_URL}/auth/register/request-otp`,
                {
                    nombre_completo: fullName,
                    email,
                    numberphone: sanitizedPhoneNumber,
                    placa: plateNumber,
                    password,
                },
                { headers: { "Content-Type": "application/json" } },
            )

            navigation.navigate("EnterCodeScreen", {
                fullName,
                email,
                phoneNumber: sanitizedPhoneNumber,
                plateNumber,
                password,
            })
        } catch (err) {
            const msg = err?.response?.data?.message || "Error al solicitar el código de verificación"
            showModal({
                title: "Error de Registro",
                message: msg,
                icon: "❌",
                color: "#F44336",
                buttons: [
                    {
                        text: "Reintentar",
                        onPress: hideModal,
                        style: "primary",
                    },
                ],
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCountrySelect = (code) => {
        setCountryCode(code)
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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

                    <Text style={styles.title}>¡Únete a nosotros!</Text>
                    <Text style={styles.subtitle}>Crea tu cuenta para comenzar</Text>

                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Nombre Completo"
                                placeholderTextColor="#999"
                                value={fullName}
                                onChangeText={setFullName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Correo Electrónico"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.phoneContainer}>
                            <View style={styles.countryPickerContainer}>
                                <CountryPicker onSelectCountry={handleCountrySelect} />
                            </View>
                            <View style={styles.phoneInputContainer}>
                                <Text style={styles.countryCodeText}>{countryCode}</Text>
                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder="Número"
                                    placeholderTextColor="#999"
                                    keyboardType="phone-pad"
                                    onChangeText={(text) => setPhoneNumber(text)}
                                    value={phoneNumber}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Placa (ej: 1234ABC)"
                                placeholderTextColor="#999"
                                value={plateNumber}
                                onChangeText={handlePlateChange}
                                maxLength={7}
                            />
                            <Text style={styles.plateHint}>Formato: 4 números + 3 letras</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Contraseña (mín. 6 caracteres)"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirmar Contraseña"
                                placeholderTextColor="#999"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>{isLoading ? "Procesando..." : "Crear Cuenta"}</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backContainer} activeOpacity={0.7}>
                        <Text style={styles.backText}>
                            ¿Ya tienes una cuenta?
                            <Text style={styles.backLink}> Inicia sesión</Text>
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.helpContainer}>
                        <Text style={styles.helpText}>
                            ¿Necesitas ayuda? Visita nuestro
                            <Text style={styles.helpLink}> centro de ayuda</Text>
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Modal Personalizado */}
            <Modal visible={modalVisible} transparent={true} animationType="none" onRequestClose={hideModal}>
                <Animated.View style={[styles.modalOverlay, { opacity: modalAnim }]}>
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            {
                                transform: [{ translateY: modalSlideAnim }],
                                borderTopColor: modalConfig.color,
                            },
                        ]}
                    >
                        <View style={[styles.modalIconContainer, { backgroundColor: modalConfig.color + "20" }]}>
                            <Text style={styles.modalIcon}>{modalConfig.icon}</Text>
                        </View>

                        <Text style={styles.modalTitle}>{modalConfig.title}</Text>
                        <Text style={styles.modalMessage}>{modalConfig.message}</Text>

                        <View style={styles.modalButtonContainer}>
                            {modalConfig.buttons.map((button, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.modalButton, button.style === "primary" && { backgroundColor: modalConfig.color }]}
                                    onPress={button.onPress}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.modalButtonText, button.style === "primary" && styles.modalButtonTextPrimary]}>
                                        {button.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
    },
    content: {
        alignItems: "center",
        paddingHorizontal: 30,
        paddingVertical: 40,
    },
    logo: {
        width: 140,
        height: 140,
        marginBottom: 20,
        borderRadius: 70,
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
        marginBottom: 30,
        textAlign: "center",
    },
    formContainer: {
        width: "100%",
        marginBottom: 20,
    },
    inputContainer: {
        width: "100%",
        marginBottom: 16,
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
    phoneContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        marginBottom: 16,
        gap: 12,
    },
    countryPickerContainer: {
        backgroundColor: "#F8F9FA",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        paddingHorizontal: 4,
    },
    phoneInputContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    countryCodeText: {
        fontSize: 16,
        color: "#2C3E50",
        fontWeight: "600",
        paddingLeft: 15,
        paddingRight: 8,
        borderRightWidth: 1,
        borderRightColor: "#E1E8ED",
    },
    phoneInput: {
        flex: 1,
        height: 55,
        paddingHorizontal: 15,
        fontSize: 16,
        color: "#2C3E50",
    },
    plateHint: {
        fontSize: 12,
        color: "#7F8C8D",
        marginTop: 4,
        marginLeft: 4,
        fontStyle: "italic",
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
    backContainer: {
        marginTop: 25,
        paddingVertical: 10,
    },
    backText: {
        fontSize: 16,
        color: "#7F8C8D",
        textAlign: "center",
    },
    backLink: {
        color: "#FF6B35",
        fontWeight: "bold",
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
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
        borderTopWidth: 4,
        minWidth: width - 80,
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
        fontSize: 22,
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: 10,
        textAlign: "center",
    },
    modalMessage: {
        fontSize: 16,
        color: "#7F8C8D",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 25,
    },
    modalButtonContainer: {
        flexDirection: "row",
        gap: 10,
        width: "100%",
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: "#F8F9FA",
        alignItems: "center",
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#7F8C8D",
    },
    modalButtonTextPrimary: {
        color: "#FFFFFF",
    },
})

export default RegisterScreen
