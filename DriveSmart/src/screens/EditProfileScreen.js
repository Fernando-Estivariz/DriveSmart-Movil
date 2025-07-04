"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
    ScrollView,
    KeyboardAvoidingView,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Config from "react-native-config"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const EditProfileScreen = ({ navigation }) => {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [licensePlate, setLicensePlate] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(-50)).current
    const profileIconScale = useRef(new Animated.Value(0.8)).current
    const buttonScale = useRef(new Animated.Value(1)).current
    const inputAnimations = useRef([]).current

    // Inicializar animaciones para inputs
    const inputFields = [
        {
            key: "name",
            value: name,
            setter: setName,
            placeholder: "Nombre Completo",
            icon: "person",
            keyboardType: "default",
        },
        {
            key: "email",
            value: email,
            setter: setEmail,
            placeholder: "Correo Electrónico",
            icon: "email",
            keyboardType: "email-address",
        },
        {
            key: "phone",
            value: phone,
            setter: setPhone,
            placeholder: "Número de Teléfono",
            icon: "phone",
            keyboardType: "phone-pad",
        },
        {
            key: "licensePlate",
            value: licensePlate,
            setter: setLicensePlate,
            placeholder: "Placa del Vehículo",
            icon: "directions-car",
            keyboardType: "default",
        },
        {
            key: "password",
            value: password,
            setter: setPassword,
            placeholder: "Nueva Contraseña",
            icon: "lock",
            keyboardType: "default",
            secure: true,
        },
        {
            key: "confirmPassword",
            value: confirmPassword,
            setter: setConfirmPassword,
            placeholder: "Confirmar Contraseña",
            icon: "lock-outline",
            keyboardType: "default",
            secure: true,
        },
    ]

    // Inicializar animaciones para cada input
    if (inputAnimations.length === 0) {
        inputFields.forEach(() => {
            inputAnimations.push(new Animated.Value(0))
        })
    }

    useEffect(() => {
        loadUserProfile()

        // Animaciones de entrada
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
            Animated.spring(profileIconScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start()

        // Animación escalonada de inputs
        const animations = inputAnimations.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            }),
        )

        Animated.stagger(100, animations).start()
    }, [])

    // Función para obtener los datos del usuario desde el servidor
    const loadUserProfile = async () => {
        try {
            const token = await AsyncStorage.getItem("authToken")
            if (!token) {
                Alert.alert("Error", "No se encontró el token de autenticación")
                return
            }

            const response = await axios.get(`${Config.API_URL}/get-profile`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const { nombre_completo, email, numberphone, placa } = response.data
            setName(nombre_completo)
            setEmail(email)
            setPhone(numberphone)
            setLicensePlate(placa)
        } catch (error) {
            console.error("Error al cargar el perfil:", error.response?.data || error.message)
            Alert.alert("Error", "Hubo un problema al cargar el perfil")
        }
    }

    const animateButton = (callback) => {
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
        callback && callback()
    }

    // Función para guardar cambios en el perfil
    const handleSave = async () => {
        // Verificar si algún campo está vacío
        if (!name || !email || !phone || !licensePlate || !password || !confirmPassword) {
            Alert.alert("Error", "Todos los campos son obligatorios")
            return
        }

        // Verificación de contraseñas
        if (password !== confirmPassword) {
            Alert.alert("Error", "Las contraseñas no coinciden")
            return
        }

        // Validación de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            Alert.alert("Error", "Por favor, introduce un correo electrónico válido")
            return
        }

        // Validación de contraseña
        if (password.length < 6) {
            Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres")
            return
        }

        setIsLoading(true)
        animateButton()

        try {
            const token = await AsyncStorage.getItem("authToken")
            if (!token) {
                Alert.alert("Error", "No se encontró el token de autenticación")
                setIsLoading(false)
                return
            }

            const response = await axios.put(
                `${Config.API_URL}/update-profile`,
                {
                    nombre_completo: name,
                    email: email,
                    numberphone: phone,
                    placa: licensePlate,
                    password: password,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            )

            if (response.status === 200) {
                Alert.alert("🎉 ¡Éxito!", "Perfil actualizado correctamente", [
                    { text: "Continuar", onPress: () => navigation.goBack() },
                ])
            }
        } catch (error) {
            console.error("Error al actualizar el perfil:", error.response?.data || error.message)
            Alert.alert("Error", "Hubo un problema al actualizar el perfil")
        } finally {
            setIsLoading(false)
        }
    }

    const renderInputField = (field, index) => (
        <Animated.View
            key={field.key}
            style={[
                styles.inputContainer,
                {
                    opacity: inputAnimations[index],
                    transform: [
                        {
                            translateY: inputAnimations[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [30, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                    <Icon name={field.icon} size={wp(5)} color="#FF6B35" />
                </View>
                <TextInput
                    style={styles.input}
                    value={field.value}
                    onChangeText={field.setter}
                    placeholder={field.placeholder}
                    placeholderTextColor="#7F8C8D"
                    keyboardType={field.keyboardType}
                    autoCapitalize={field.key === "email" ? "none" : "words"}
                    secureTextEntry={field.secure && (field.key === "password" ? !showPassword : !showConfirmPassword)}
                />
                {field.secure && (
                    <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => {
                            if (field.key === "password") {
                                setShowPassword(!showPassword)
                            } else {
                                setShowConfirmPassword(!showConfirmPassword)
                            }
                        }}
                    >
                        <Icon
                            name={
                                field.key === "password"
                                    ? showPassword
                                        ? "visibility-off"
                                        : "visibility"
                                    : showConfirmPassword
                                        ? "visibility-off"
                                        : "visibility"
                            }
                            size={wp(5)}
                            color="#7F8C8D"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    )

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
                    <Text style={styles.headerTitle}>Editar Perfil</Text>
                    <View style={styles.placeholder} />
                </Animated.View>

                {/* Profile Icon Section */}
                <Animated.View
                    style={[
                        styles.profileSection,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: profileIconScale }],
                        },
                    ]}
                >
                    <View style={styles.profileIconContainer}>
                        <Icon name="account-circle" size={wp(25)} color="#FF6B35" />
                        <View style={styles.editIconBadge}>
                            <Icon name="edit" size={wp(4)} color="#FFFFFF" />
                        </View>
                    </View>
                    <Text style={styles.profileTitle}>Actualiza tu información</Text>
                    <Text style={styles.profileSubtitle}>Mantén tus datos siempre actualizados</Text>
                </Animated.View>

                {/* Form Section */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Información Personal</Text>
                    {inputFields.slice(0, 4).map((field, index) => renderInputField(field, index))}

                    <Text style={styles.sectionTitle}>Seguridad</Text>
                    {inputFields.slice(4).map((field, index) => renderInputField(field, index + 4))}

                    <View style={styles.passwordHint}>
                        <Icon name="info-outline" size={wp(4)} color="#7F8C8D" />
                        <Text style={styles.hintText}>La contraseña debe tener al menos 6 caracteres</Text>
                    </View>
                </View>

                {/* Save Button */}
                <Animated.View
                    style={[
                        styles.buttonContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: buttonScale }],
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        <Icon name="save" size={wp(5)} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>{isLoading ? "Guardando..." : "Guardar Cambios"}</Text>
                    </TouchableOpacity>
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
    profileIconContainer: {
        position: "relative",
        marginBottom: hp(1),
    },
    editIconBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#FF6B35",
        borderRadius: wp(3),
        padding: wp(1.5),
        borderWidth: 3,
        borderColor: "#FFFFFF",
    },
    profileTitle: {
        fontSize: wp(4.5),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: 4,
    },
    profileSubtitle: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        textAlign: "center",
    },
    formSection: {
        paddingHorizontal: wp(4),
    },
    sectionTitle: {
        fontSize: wp(4),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: hp(2),
        marginTop: hp(1),
    },
    inputContainer: {
        marginBottom: hp(2),
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        paddingHorizontal: wp(3),
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
    inputIconContainer: {
        marginRight: wp(3),
        paddingVertical: hp(2),
    },
    input: {
        flex: 1,
        fontSize: wp(4),
        color: "#2C3E50",
        paddingVertical: hp(2),
    },
    eyeButton: {
        padding: wp(2),
    },
    passwordHint: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F4FD",
        borderRadius: wp(2),
        padding: wp(3),
        marginTop: hp(1),
    },
    hintText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginLeft: wp(2),
        flex: 1,
    },
    buttonContainer: {
        paddingHorizontal: wp(4),
        paddingTop: hp(3),
    },
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(3),
        paddingVertical: hp(2),
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonDisabled: {
        backgroundColor: "#FFB399",
        shadowOpacity: 0.1,
    },
    saveButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
})

export default EditProfileScreen
