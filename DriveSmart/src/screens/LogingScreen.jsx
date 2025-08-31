// src/screens/LoadingScreen.js
import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';

const LoadingScreen = ({ navigation }) => {
    useEffect(() => {
        // Simula la carga de recursos
        setTimeout(() => {
            navigation.replace('Login');
        }, 4000);
    }, [navigation]);

    return (
        <View style={styles.container}>
            <Image source={require('../../assets/DRIVESMART.png')} style={styles.logo} />
            <Image source={require('../../assets/car-driver.png')} style={styles.image} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    logo: {
        width: 250,
        height: 250,
        marginBottom: 90,
    },
    image: {
        width: 400,
        height: 200,
        
    },
});

export default LoadingScreen;
