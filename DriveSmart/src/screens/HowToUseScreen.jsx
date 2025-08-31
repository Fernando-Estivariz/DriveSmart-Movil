"use client"

import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
    ScrollView,
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"

const { width, height } = Dimensions.get("window")

// Responsive helper functions
const wp = (percentage) => (width * percentage) / 100
const hp = (percentage) => (height * percentage) / 100

const HowToUseScreen = ({ navigation }) => {
    const [currentStep, setCurrentStep] = useState(0)
    const [isAutoPlaying, setIsAutoPlaying] = useState(false)

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(-50)).current
    const stepAnimations = useRef([]).current
    const progressAnim = useRef(new Animated.Value(0)).current

    // Datos de los pasos del tutorial
    const tutorialSteps = [
        {
            id: 1,
            title: "🚗 Planifica tu Ruta",
            subtitle: "Navegación Inteligente",
            description: "Encuentra la mejor ruta a tu destino evitando tráfico y restricciones vehiculares.",
            icon: "directions",
            color: "#FF6B35",
            bgColor: "#FFF5F2",
            steps: [
                "Toca el botón '¿Adónde vas?' en la pantalla principal",
                "Escribe tu destino o selecciónalo en el mapa",
                "Revisa la ruta sugerida y el tiempo estimado",
                "Presiona 'Empezar' para iniciar la navegación",
            ],
            tips: "💡 La app considera restricciones de placas y tráfico en tiempo real",
        },
        {
            id: 2,
            title: "🚫 Restricción de Placas",
            subtitle: "Evita Multas",
            description: "Consulta qué días no puedes circular según el último número de tu placa vehicular.",
            icon: "no-crash",
            color: "#E74C3C",
            bgColor: "#FDEDEC",
            steps: [
                "Ve al menú y selecciona 'Restricción de Placas'",
                "Consulta el calendario semanal de restricciones",
                "Verifica si hoy puedes circular",
                "Planifica tus viajes según las restricciones",
            ],
            tips: "⏰ Las restricciones aplican de 07:00 a 19:00 horas",
        },
        {
            id: 3,
            title: "🅿️ Encuentra Estacionamientos",
            subtitle: "Aparca sin Problemas",
            description: "Localiza zonas de estacionamiento permitido, tarifado y prohibido en la ciudad.",
            icon: "local-parking",
            color: "#9B59B6",
            bgColor: "#F4ECF7",
            steps: [
                "Accede a 'Estacionamientos' desde el menú",
                "Observa las líneas de colores en el mapa",
                "Rojo = Prohibido, Azul = Tarifado, Sin línea = Libre",
                "Planifica dónde aparcar antes de llegar",
            ],
            tips: "🕐 Los horarios de restricción varían según la zona",
        },
        {
            id: 4,
            title: "👤 Personaliza tu Perfil",
            subtitle: "Mantén tus Datos Actualizados",
            description: "Actualiza tu información personal y los datos de tu vehículo para una mejor experiencia.",
            icon: "person",
            color: "#3498DB",
            bgColor: "#EBF5FF",
            steps: [
                "Ve a 'Editar Perfil' en el menú principal",
                "Actualiza tu nombre, email y teléfono",
                "Modifica el número de placa de tu vehículo",
                "Guarda los cambios para sincronizar",
            ],
            tips: "🔒 Tus datos están protegidos y encriptados",
        },
        {
            id: 5,
            title: "🎯 Consejos Generales",
            subtitle: "Aprovecha al Máximo la App",
            description: "Sigue estos consejos para tener la mejor experiencia con DriveSmart.",
            icon: "lightbulb-outline",
            color: "#F39C12",
            bgColor: "#FEF9E7",
            steps: [
                "Mantén activado el GPS para mejor precisión",
                "Actualiza la app regularmente para nuevas funciones",
                "Consulta las restricciones antes de salir",
                "Usa el modo navegación para rutas largas",
            ],
            tips: "📱 La app funciona mejor con conexión a internet",
        },
    ]

    // Inicializar animaciones
    if (stepAnimations.length === 0) {
        tutorialSteps.forEach(() => {
            stepAnimations.push(new Animated.Value(0))
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
        ]).start()

        // Animar el paso actual
        animateCurrentStep()
    }, [currentStep])

    const animateCurrentStep = () => {
        // Reset all animations
        stepAnimations.forEach((anim) => anim.setValue(0))

        // Animate current step
        Animated.timing(stepAnimations[currentStep], {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start()

        // Update progress bar
        Animated.timing(progressAnim, {
            toValue: (currentStep + 1) / tutorialSteps.length,
            duration: 400,
            useNativeDriver: false,
        }).start()
    }

    const nextStep = () => {
        if (currentStep < tutorialSteps.length - 1) {
            setCurrentStep(currentStep + 1)
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const goToStep = (index) => {
        setCurrentStep(index)
    }

    const startAutoPlay = () => {
        setIsAutoPlaying(true)
        const interval = setInterval(() => {
            setCurrentStep((prev) => {
                if (prev >= tutorialSteps.length - 1) {
                    setIsAutoPlaying(false)
                    clearInterval(interval)
                    return prev
                }
                return prev + 1
            })
        }, 4000)
    }

    const currentTutorial = tutorialSteps[currentStep]

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
                    <Text style={styles.headerTitle}>Cómo Usar DriveSmart</Text>
                    <TouchableOpacity style={styles.autoPlayButton} onPress={startAutoPlay} activeOpacity={0.7}>
                        <Icon name={isAutoPlaying ? "pause" : "play-arrow"} size={wp(5)} color="#FF6B35" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Progress Bar */}
                <Animated.View style={[styles.progressContainer, { opacity: fadeAnim }]}>
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ["0%", "100%"],
                                    }),
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {currentStep + 1} de {tutorialSteps.length}
                    </Text>
                </Animated.View>

                {/* Step Indicators */}
                <View style={styles.stepIndicators}>
                    {tutorialSteps.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.stepDot, index === currentStep && styles.stepDotActive]}
                            onPress={() => goToStep(index)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.stepDotText, index === currentStep && styles.stepDotTextActive]}>{index + 1}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Main Content */}
                <Animated.View
                    style={[
                        styles.contentContainer,
                        {
                            opacity: stepAnimations[currentStep],
                            transform: [
                                {
                                    translateY: stepAnimations[currentStep].interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [30, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {/* Icon and Title */}
                    <View style={[styles.iconContainer, { backgroundColor: currentTutorial.bgColor }]}>
                        <Icon name={currentTutorial.icon} size={wp(12)} color={currentTutorial.color} />
                    </View>

                    <Text style={styles.stepTitle}>{currentTutorial.title}</Text>
                    <Text style={styles.stepSubtitle}>{currentTutorial.subtitle}</Text>
                    <Text style={styles.stepDescription}>{currentTutorial.description}</Text>

                    {/* Steps List */}
                    <View style={styles.stepsList}>
                        <Text style={styles.stepsTitle}>Pasos a seguir:</Text>
                        {currentTutorial.steps.map((step, index) => (
                            <View key={index} style={styles.stepItem}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.stepText}>{step}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Tips */}
                    <View style={styles.tipsContainer}>
                        <Text style={styles.tipsText}>{currentTutorial.tips}</Text>
                    </View>
                </Animated.View>

                {/* Navigation Buttons */}
                <Animated.View style={[styles.navigationContainer, { opacity: fadeAnim }]}>
                    <TouchableOpacity
                        style={[styles.navButton, styles.prevButton, currentStep === 0 && styles.navButtonDisabled]}
                        onPress={prevStep}
                        disabled={currentStep === 0}
                        activeOpacity={0.8}
                    >
                        <Icon name="chevron-left" size={wp(6)} color={currentStep === 0 ? "#BDC3C7" : "#FF6B35"} />
                        <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>Anterior</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.navButton,
                            styles.nextButton,
                            currentStep === tutorialSteps.length - 1 && styles.finishButton,
                        ]}
                        onPress={currentStep === tutorialSteps.length - 1 ? () => navigation.goBack() : nextStep}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentStep === tutorialSteps.length - 1 ? "Finalizar" : "Siguiente"}
                        </Text>
                        <Icon
                            name={currentStep === tutorialSteps.length - 1 ? "check" : "chevron-right"}
                            size={wp(6)}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>
                </Animated.View>

                {/* Quick Actions */}
                <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
                    <Text style={styles.quickActionsTitle}>Accesos Rápidos</Text>
                    <View style={styles.quickActionsList}>
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => navigation.navigate("Home")}
                            activeOpacity={0.8}
                        >
                            <Icon name="home" size={wp(5)} color="#FF6B35" />
                            <Text style={styles.quickActionText}>Ir a Inicio</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => navigation.navigate("MapaPlacas")}
                            activeOpacity={0.8}
                        >
                            <Icon name="no-crash" size={wp(5)} color="#E74C3C" />
                            <Text style={styles.quickActionText}>Ver Restricciones</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => navigation.navigate("MapaEstacionamientos")}
                            activeOpacity={0.8}
                        >
                            <Icon name="local-parking" size={wp(5)} color="#9B59B6" />
                            <Text style={styles.quickActionText}>Estacionamientos</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Help Section */}
                <View style={styles.helpSection}>
                    <Icon name="help-outline" size={wp(5)} color="#FF6B35" />
                    <Text style={styles.helpText}>
                        ¿Tienes más preguntas? Visita nuestro
                        <Text style={styles.helpLink}> centro de ayuda</Text> o contáctanos directamente.
                    </Text>
                </View>
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
        fontSize: wp(4.5),
        fontWeight: "bold",
        color: "#2C3E50",
    },
    autoPlayButton: {
        backgroundColor: "#FFF5F2",
        borderRadius: wp(2),
        padding: wp(2),
    },
    progressContainer: {
        paddingHorizontal: wp(4),
        marginBottom: hp(2),
    },
    progressBar: {
        height: 6,
        backgroundColor: "#E1E8ED",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: hp(1),
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#FF6B35",
        borderRadius: 3,
    },
    progressText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        textAlign: "center",
    },
    stepIndicators: {
        flexDirection: "row",
        justifyContent: "center",
        paddingHorizontal: wp(4),
        marginBottom: hp(3),
        gap: wp(2),
    },
    stepDot: {
        width: wp(8),
        height: wp(8),
        borderRadius: wp(4),
        backgroundColor: "#E1E8ED",
        justifyContent: "center",
        alignItems: "center",
    },
    stepDotActive: {
        backgroundColor: "#FF6B35",
    },
    stepDotText: {
        fontSize: wp(3),
        color: "#7F8C8D",
        fontWeight: "600",
    },
    stepDotTextActive: {
        color: "#FFFFFF",
    },
    contentContainer: {
        paddingHorizontal: wp(4),
        alignItems: "center",
    },
    iconContainer: {
        width: wp(24),
        height: wp(24),
        borderRadius: wp(12),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: hp(2),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
    },
    stepTitle: {
        fontSize: wp(6),
        fontWeight: "bold",
        color: "#2C3E50",
        textAlign: "center",
        marginBottom: hp(1),
    },
    stepSubtitle: {
        fontSize: wp(4),
        color: "#FF6B35",
        fontWeight: "600",
        textAlign: "center",
        marginBottom: hp(1),
    },
    stepDescription: {
        fontSize: wp(3.8),
        color: "#7F8C8D",
        textAlign: "center",
        lineHeight: wp(5.5),
        marginBottom: hp(3),
    },
    stepsList: {
        width: "100%",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        padding: wp(4),
        marginBottom: hp(2),
    },
    stepsTitle: {
        fontSize: wp(4),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: hp(2),
    },
    stepItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: hp(1.5),
    },
    stepNumber: {
        width: wp(6),
        height: wp(6),
        borderRadius: wp(3),
        backgroundColor: "#FF6B35",
        justifyContent: "center",
        alignItems: "center",
        marginRight: wp(3),
        marginTop: 2,
    },
    stepNumberText: {
        fontSize: wp(3),
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    stepText: {
        fontSize: wp(3.5),
        color: "#2C3E50",
        flex: 1,
        lineHeight: wp(5),
    },
    tipsContainer: {
        width: "100%",
        backgroundColor: "#E8F4FD",
        borderRadius: wp(3),
        padding: wp(3),
        marginBottom: hp(3),
        borderLeftWidth: 4,
        borderLeftColor: "#3498DB",
    },
    tipsText: {
        fontSize: wp(3.5),
        color: "#2C3E50",
        lineHeight: wp(5),
    },
    navigationContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: wp(4),
        marginBottom: hp(3),
        gap: wp(3),
    },
    navButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(4),
        borderRadius: wp(3),
        flex: 1,
    },
    prevButton: {
        backgroundColor: "#F8F9FA",
        borderWidth: 2,
        borderColor: "#E1E8ED",
        justifyContent: "center",
    },
    nextButton: {
        backgroundColor: "#FF6B35",
        justifyContent: "center",
        shadowColor: "#FF6B35",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    finishButton: {
        backgroundColor: "#27AE60",
    },
    navButtonDisabled: {
        backgroundColor: "#F1F2F6",
        borderColor: "#E1E8ED",
    },
    navButtonText: {
        fontSize: wp(3.8),
        color: "#FF6B35",
        fontWeight: "600",
    },
    navButtonTextDisabled: {
        color: "#BDC3C7",
    },
    nextButtonText: {
        fontSize: wp(3.8),
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    quickActions: {
        paddingHorizontal: wp(4),
        marginBottom: hp(2),
    },
    quickActionsTitle: {
        fontSize: wp(4),
        fontWeight: "bold",
        color: "#2C3E50",
        marginBottom: hp(2),
    },
    quickActionsList: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: wp(2),
    },
    quickActionButton: {
        flex: 1,
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: wp(3),
        paddingVertical: hp(2),
        borderWidth: 1,
        borderColor: "#E1E8ED",
    },
    quickActionText: {
        fontSize: wp(3),
        color: "#2C3E50",
        fontWeight: "500",
        marginTop: wp(1),
        textAlign: "center",
    },
    helpSection: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#FFF5F2",
        borderRadius: wp(3),
        padding: wp(4),
        marginHorizontal: wp(4),
    },
    helpText: {
        fontSize: wp(3.2),
        color: "#7F8C8D",
        marginLeft: wp(2),
        flex: 1,
        lineHeight: wp(4.5),
    },
    helpLink: {
        color: "#FF6B35",
        fontWeight: "bold",
    },
})

export default HowToUseScreen
