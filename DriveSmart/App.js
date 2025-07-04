import { StyleSheet, Text, View } from 'react-native';
import 'react-native-gesture-handler';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import Login from './src/screens/Login';
import Home from './src/screens/Home';
import LogingScreen from './src/screens/LogingScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EnterCodeScreen from './src/screens/EnterCodeScreen';
import InvalidCodeScreen from './src/screens/InvalidCodeScreen';
import SuccessScreen from './src/screens/SuccessScreen';
import MenuScreen from './src/screens/MenuScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SearchScreen from './src/screens/SearchScreen';
import ConfirmarRecorridoScreen from './src/screens/ConfirmarRecorridoScreen';
import NavegacionScreen from './src/screens/NavegacionScreen';
import MapaEstacionamientos from './src/screens/MapaEstacionamientos';
import MapaPlacas from './src/screens/MapaPlacas';
import SeleccionarUbicacionScreen from './src/screens/SeleccionarUbicacionScreen';
import HowToUseScreen from './src/screens/HowToUseScreen';


export default function App() {


    const Stack = createStackNavigator();
    function MyStack() {
        return (
            <Stack.Navigator initialRouteName="Loading" screenOptions={{ headerShown: false }}>
                <Stack.Screen name='LogingScreen' component={LogingScreen} />
                <Stack.Screen name="Login" component={Login} />
                <Stack.Screen name="Home" component={Home} />
                <Stack.Screen name='RegisterScreen' component={RegisterScreen} />
                <Stack.Screen name='EnterCodeScreen' component={EnterCodeScreen} />
                <Stack.Screen name='InvalidCodeScreen' component={InvalidCodeScreen} />
                <Stack.Screen name='SuccessScreen' component={SuccessScreen} />
                <Stack.Screen name='MenuScreen' component={MenuScreen} />
                <Stack.Screen name='EditProfileScreen' component={EditProfileScreen} />
                <Stack.Screen name='SearchScreen' component={SearchScreen}  />
                <Stack.Screen name='ConfirmarRecorridoScreen' component={ConfirmarRecorridoScreen} />
                <Stack.Screen name='NavegacionScreen' component={NavegacionScreen} />
                <Stack.Screen name='MapaEstacionamientos' component={MapaEstacionamientos} />
                <Stack.Screen name='MapaPlacas' component={MapaPlacas} />
                <Stack.Screen name='SeleccionarUbicacionScreen' component={SeleccionarUbicacionScreen} />
                <Stack.Screen name='HowToUseScreen' component={HowToUseScreen} />
            </Stack.Navigator>
        );
    }

    return (
        <NavigationContainer>
            <MyStack />
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});


