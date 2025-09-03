"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput } from "react-native"

const countries = [
    { code: "BO", name: "Bolivia", flag: "🇧🇴", dialCode: "+591" },
    { code: "AR", name: "Argentina", flag: "🇦🇷", dialCode: "+54" },
    { code: "BR", name: "Brasil", flag: "🇧🇷", dialCode: "+55" },
    { code: "CL", name: "Chile", flag: "🇨🇱", dialCode: "+56" },
    { code: "CO", name: "Colombia", flag: "🇨🇴", dialCode: "+57" },
    { code: "EC", name: "Ecuador", flag: "🇪🇨", dialCode: "+593" },
    { code: "PE", name: "Perú", flag: "🇵🇪", dialCode: "+51" },
    { code: "PY", name: "Paraguay", flag: "🇵🇾", dialCode: "+595" },
    { code: "UY", name: "Uruguay", flag: "🇺🇾", dialCode: "+598" },
    { code: "VE", name: "Venezuela", flag: "🇻🇪", dialCode: "+58" },
]

const CountryPicker = ({ onSelectCountry }) => {
    const [modalVisible, setModalVisible] = useState(false)
    const [selectedCountry, setSelectedCountry] = useState(countries[0]) // Bolivia por defecto
    const [searchText, setSearchText] = useState("")

    const filteredCountries = countries.filter(
        (country) => country.name.toLowerCase().includes(searchText.toLowerCase()) || country.dialCode.includes(searchText),
    )

    const handleSelectCountry = (country) => {
        setSelectedCountry(country)
        onSelectCountry(country.dialCode)
        setModalVisible(false)
        setSearchText("")
    }

    return (
        <View>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setModalVisible(true)}>
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seleccionar País</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar país..."
                            placeholderTextColor="#999"
                            value={searchText}
                            onChangeText={setSearchText}
                        />

                        <FlatList
                            data={filteredCountries}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.countryItem, selectedCountry.code === item.code && styles.selectedCountryItem]}
                                    onPress={() => handleSelectCountry(item)}
                                >
                                    <Text style={styles.countryFlag}>{item.flag}</Text>
                                    <View style={styles.countryInfo}>
                                        <Text style={styles.countryName}>{item.name}</Text>
                                        <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                                    </View>
                                    {selectedCountry.code === item.code && <Text style={styles.checkmark}>✓</Text>}
                                </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    pickerButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 15,
        backgroundColor: "#F8F9FA",
        borderRadius: 12,
        minWidth: 100,
    },
    flag: {
        fontSize: 20,
        marginRight: 8,
    },
    countryCode: {
        fontSize: 16,
        color: "#2C3E50",
        fontWeight: "600",
        marginRight: 6,
    },
    arrow: {
        fontSize: 12,
        color: "#7F8C8D",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#2C3E50",
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#F8F9FA",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButtonText: {
        fontSize: 16,
        color: "#7F8C8D",
        fontWeight: "bold",
    },
    searchInput: {
        margin: 20,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: "#F8F9FA",
        borderRadius: 10,
        fontSize: 16,
        color: "#2C3E50",
    },
    countryItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    selectedCountryItem: {
        backgroundColor: "#FFF5F2",
    },
    countryFlag: {
        fontSize: 24,
        marginRight: 15,
    },
    countryInfo: {
        flex: 1,
    },
    countryName: {
        fontSize: 16,
        color: "#2C3E50",
        fontWeight: "500",
    },
    countryDialCode: {
        fontSize: 14,
        color: "#7F8C8D",
        marginTop: 2,
    },
    checkmark: {
        fontSize: 18,
        color: "#FF6B35",
        fontWeight: "bold",
    },
})

export default CountryPicker
