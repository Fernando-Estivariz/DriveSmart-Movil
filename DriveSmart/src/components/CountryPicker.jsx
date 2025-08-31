import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 

const countries = [
    { label: 'Bolivia', value: '+591', flag: '🇧🇴' },
    { label: 'Argentina', value: '+54', flag: '🇦🇷' },
    { label: 'Perú', value: '+51', flag: '🇵🇪' },
    { label: 'Brasil', value: '+55', flag: '🇧🇷' },
    
];

const CountryPicker = ({ onSelectCountry }) => {
    const [selectedCountry, setSelectedCountry] = useState(countries[0].value);

    const handleValueChange = (itemValue) => {
        setSelectedCountry(itemValue);
        onSelectCountry(itemValue);
    };

    return (
        <View style={styles.container}>
            <Picker
                selectedValue={selectedCountry}
                style={styles.picker}
                onValueChange={handleValueChange}
            >
                {countries.map((country) => (
                    <Picker.Item
                        key={country.value}
                        label={`${country.flag} ${country.label}`}
                        value={country.value}
                    />
                ))}
            </Picker>
            <Text style={styles.code}>{selectedCountry}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    picker: {
        height: 50,
        width: 175,
    },
    code: {
        fontSize: 15,
        marginLeft: 10,
        color:"#000",
    },
});

export default CountryPicker;
