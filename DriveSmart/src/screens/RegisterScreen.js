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
    ScrollView,
} from "react-native"
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

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const logoScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current

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

    const validatePlateNumber = (plate) => {
        const plateRegex = /^[A-Z0-9-]+$/
        return plateRegex.test(plate)
    }

    const handleRegister = () => {
        // Validación de campos vacíos
        if (!fullName || !email || !phoneNumber || !plateNumber || !password || !confirmPassword) {
            Alert.alert("Error", "Por favor, completa todos los campos")
            return
        }

        // Validación de formato de correo electrónico
        if (!validateEmail(email)) {
            Alert.alert("Error", "Por favor, introduce un correo electrónico válido")
            return
        }

        // Validación de formato de número de placa
        if (!validatePlateNumber(plateNumber)) {
            Alert.alert("Error", "El número de placa solo puede contener letras, números y guiones")
            return
        }

        // Validación de contraseña
        if (password.length < 6) {
            Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres")
            return
        }

        // Validación de confirmación de contraseña
        if (password !== confirmPassword) {
            Alert.alert("Error", "Las contraseñas no coinciden")
            return
        }

        setIsLoading(true)
        animateButton()

        // Preparación del número de teléfono
        const sanitizedPhoneNumber = `${countryCode}${phoneNumber}`.replace("+", "")

        // Simular delay de procesamiento
        setTimeout(() => {
            setIsLoading(false)
            navigation.navigate("EnterCodeScreen", {
                fullName,
                email,
                phoneNumber: sanitizedPhoneNumber,
                plateNumber,
                password,
            })
        }, 1000)
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
                                placeholder="Número de Placa (ej: ABC-123)"
                                placeholderTextColor="#999"
                                value={plateNumber}
                                onChangeText={setPlateNumber}
                                autoCapitalize="characters"
                            />
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
        gap: 10,
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
    },
    phoneInputContainer: {
        flex: 1,
    },
    phoneInput: {
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
})

export default RegisterScreen
