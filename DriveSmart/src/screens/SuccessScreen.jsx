"use client"

import { useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Animated, StatusBar } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const SuccessScreen = ({ navigation }) => {
    const [countdown, setCountdown] = useState(5)
    const [isRedirecting, setIsRedirecting] = useState(false)

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(100)).current
    const logoScale = useRef(new Animated.Value(0.5)).current
    const checkmarkScale = useRef(new Animated.Value(0)).current
    const checkmarkRotate = useRef(new Animated.Value(0)).current
    const pulseAnim = useRef(new Animated.Value(1)).current
    const confettiAnim = useRef(new Animated.Value(0)).current
    const buttonScale = useRef(new Animated.Value(1)).current

    // Partículas de confetti
    const confettiParticles = useRef([]).current
    const numberOfParticles = 20

    // Inicializar partículas de confetti
    if (confettiParticles.length === 0) {
        for (let i = 0; i < numberOfParticles; i++) {
            confettiParticles.push({
                x: new Animated.Value(Math.random() * width),
                y: new Animated.Value(-50),
                rotation: new Animated.Value(0),
                scale: new Animated.Value(Math.random() * 0.5 + 0.5),
                color: ["#FF6B35", "#E74C3C", "#F39C12", "#27AE60", "#3498DB"][Math.floor(Math.random() * 5)],
            })
        }
    }

    useEffect(() => {
        // Secuencia de animaciones de entrada
        Animated.sequence([
            // Fade in inicial
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            // Logo aparece con bounce
            Animated.spring(logoScale, {
                toValue: 1,
                tension: 50,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start()

        // Slide up del contenido
        Animated.timing(slideUpAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
        }).start()

        // Checkmark aparece después de un delay
        setTimeout(() => {
            Animated.parallel([
                Animated.spring(checkmarkScale, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(checkmarkRotate, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]).start()

            // Iniciar confetti
            startConfetti()
        }, 500)

        // Pulso continuo del checkmark
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        )
        pulseAnimation.start()

        // Countdown timer
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    setIsRedirecting(true)
                    clearInterval(timer)
                    setTimeout(() => {
                        navigation.navigate("Home")
                    }, 1000)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            clearInterval(timer)
            pulseAnimation.stop()
        }
    }, [navigation])

    const startConfetti = () => {
        const animations = confettiParticles.map((particle) => {
            return Animated.parallel([
                Animated.timing(particle.y, {
                    toValue: height + 100,
                    duration: 3000 + Math.random() * 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(particle.rotation, {
                    toValue: Math.random() * 10,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        })

        Animated.stagger(100, animations).start()
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

    const handleManualRedirect = () => {
        animateButton(() => {
            setIsRedirecting(true)
            navigation.navigate("Home")
        })
    }

    const handleGoToLogin = () => {
        animateButton(() => {
            navigation.navigate("LoginScreen")
        })
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Confetti particles */}
            {confettiParticles.map((particle, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.confettiParticle,
                        {
                            backgroundColor: particle.color,
                            transform: [
                                { translateX: particle.x },
                                { translateY: particle.y },
                                {
                                    rotate: particle.rotation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ["0deg", "360deg"],
                                    }),
                                },
                                { scale: particle.scale },
                            ],
                        },
                    ]}
                />
            ))}

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideUpAnim }],
                    },
                ]}
            >
                {/* Logo con animación */}
                <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                    <Image source={require("../../assets/DRIVESMART.png")} style={styles.logo} />
                </Animated.View>

                {/* Título principal */}
                <Text style={styles.title}>🎉 ¡Registro Exitoso!</Text>
                <Text style={styles.subtitle}>Bienvenido a DriveSmart</Text>

                {/* Checkmark animado */}
                <Animated.View
                    style={[
                        styles.checkmarkContainer,
                        {
                            transform: [
                                { scale: Animated.multiply(checkmarkScale, pulseAnim) },
                                {
                                    rotate: checkmarkRotate.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ["0deg", "360deg"],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Icon name="check" size={wp(12)} color="#FFFFFF" />
                </Animated.View>

                {/* Mensaje de éxito */}
                <View style={styles.messageContainer}>
                    <Text style={styles.message}>Tu cuenta ha sido creada exitosamente</Text>
                    <Text style={styles.submessage}>Ya puedes comenzar a usar todas las funciones de la aplicación</Text>
                </View>

                {/* Contador y redirección */}
                <View style={styles.redirectContainer}>
                    {!isRedirecting ? (
                        <>
                            <View style={styles.countdownContainer}>
                                <Icon name="schedule" size={wp(5)} color="#FF6B35" />
                                <Text style={styles.countdownText}>
                                    Redirigiendo en <Text style={styles.countdownNumber}>{countdown}</Text> segundos...
                                </Text>
                            </View>

                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <TouchableOpacity style={styles.redirectButton} onPress={handleManualRedirect} activeOpacity={0.8}>
                                    <Icon name="arrow-forward" size={wp(5)} color="#FFFFFF" />
                                    <Text style={styles.redirectButtonText}>Ir Ahora</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </>
                    ) : (
                        <View style={styles.redirectingContainer}>
                            <Icon name="refresh" size={wp(6)} color="#FF6B35" />
                            <Text style={styles.redirectingText}>Redirigiendo...</Text>
                        </View>
                    )}
                </View>

                {/* Botones de acción */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleGoToLogin} activeOpacity={0.8}>
                        <Icon name="login" size={wp(4)} color="#FF6B35" />
                        <Text style={styles.secondaryButtonText}>Ir a Inicio de Sesión</Text>
                    </TouchableOpacity>
                </View>

                {/* Features destacadas */}
                <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>¿Qué puedes hacer ahora?</Text>
                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <Icon name="directions" size={wp(4)} color="#FF6B35" />
                            <Text style={styles.featureText}>Planificar rutas inteligentes</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Icon name="no-crash" size={wp(4)} color="#FF6B35" />
                            <Text style={styles.featureText}>Consultar restricciones de placas</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Icon name="local-parking" size={wp(4)} color="#FF6B35" />
                            <Text style={styles.featureText}>Encontrar estacionamientos</Text>
                        </View>
                    </View>
                </View>

                {/* Help section */}
                <View style={styles.helpContainer}>
                    <Text style={styles.helpText}>
                        ¿Necesitas ayuda? Visita nuestro
                        <Text style={styles.helpLink}> centro de ayuda</Text>
                    </Text>
                </View>
            </Animated.View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        position: "relative",
    },
    confettiParticle: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: wp(6),
        paddingVertical: hp(4),
    },
    logo: {
        width: wp(30),
        height: wp(30),
        borderRadius: wp(15),
        marginBottom: hp(3),
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
    },
    title: {
        fontSize: wp(7),
        fontWeight: "bold",
        color: "#2C3E50",
        textAlign: "center",
        marginBottom: hp(1),
    },
    subtitle: {
        fontSize: wp(4.5),
        color: "#7F8C8D",
        textAlign: "center",
        marginBottom: hp(4),
    },
    checkmarkContainer: {
        width: wp(20),
        height: wp(20),
        borderRadius: wp(10),
        backgroundColor: "#27AE60",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: hp(3),
        shadowColor: "#27AE60",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 12,
    },
    messageContainer: {
        alignItems: "center",
        marginBottom: hp(4),
    },
    message: {
        fontSize: wp(4.2),
        fontWeight: "600",
        color: "#2C3E50",
        textAlign: "center",
        marginBottom: hp(1),
    },
    submessage: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        textAlign: "center",
        lineHeight: wp(5),
    },
    redirectContainer: {
        alignItems: "center",
        marginBottom: hp(3),
    },
    countdownContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF5F2",
        borderRadius: wp(3),
        paddingHorizontal: wp(4),
        paddingVertical: wp(2),
        marginBottom: hp(2),
    },
    countdownText: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        marginLeft: wp(2),
    },
    countdownNumber: {
        fontWeight: "bold",
        color: "#FF6B35",
    },
    redirectButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FF6B35",
        borderRadius: wp(3),
        paddingHorizontal: wp(6),
        paddingVertical: wp(3),
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    redirectButtonText: {
        color: "#FFFFFF",
        fontSize: wp(4),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
    redirectingContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F4FD",
        borderRadius: wp(3),
        paddingHorizontal: wp(4),
        paddingVertical: wp(2),
    },
    redirectingText: {
        fontSize: wp(4),
        color: "#FF6B35",
        fontWeight: "600",
        marginLeft: wp(2),
    },
    actionButtons: {
        width: "100%",
        marginBottom: hp(3),
    },
    secondaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: wp(3),
        paddingVertical: wp(3),
        borderWidth: 2,
        borderColor: "#FF6B35",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    secondaryButtonText: {
        color: "#FF6B35",
        fontSize: wp(3.8),
        fontWeight: "bold",
        marginLeft: wp(2),
    },
    featuresContainer: {
        width: "100%",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        padding: wp(4),
        marginBottom: hp(2),
    },
    featuresTitle: {
        fontSize: wp(4),
        fontWeight: "bold",
        color: "#2C3E50",
        textAlign: "center",
        marginBottom: hp(2),
    },
    featuresList: {
        gap: hp(1),
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    featureText: {
        fontSize: wp(3.5),
        color: "#7F8C8D",
        marginLeft: wp(3),
        flex: 1,
    },
    helpContainer: {
        alignItems: "center",
    },
    helpText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        textAlign: "center",
    },
    helpLink: {
        color: "#FF6B35",
        fontWeight: "bold",
    },
})

export default SuccessScreen
