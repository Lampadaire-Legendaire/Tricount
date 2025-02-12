import { Image, StyleSheet, TextInput, View, Text, Switch } from 'react-native';
import React, {useState} from "react";
import RNPickerSelect from "react-native-picker-select";

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Float } from 'react-native/Libraries/Types/CodegenTypes';

export default function HomeScreen() {
  const [selectedValue, setSelectedValue] = useState<string>("option1");
  const [selectedValueMoney, setSelectedValueMoney] = useState<string>("euro");

  const [isAllEnabled, setAllIsEnabled] = useState(true);
  const toggleSwitchAll = () => {
    toggleSwitchUAlone();
    toggleSwitchU2Alone();
    toggleSwitchU3Alone();
    toggleSwitchAllAlone();
  };
  const toggleSwitchAllAlone = () => setAllIsEnabled((previousState) => !previousState);

  const [isUEnabled, setUIsEnabled]= useState(true)
  const toggleSwitchU = () => {
    if (isU2Enabled && isU3Enabled)
      toggleSwitchAllAlone();
    toggleSwitchUAlone();
  };
  const toggleSwitchUAlone = () => setUIsEnabled((previousState) => !previousState);

  const [isU2Enabled, setU2IsEnabled]= useState(true)
  const toggleSwitchU2 = () => {
    if (isUEnabled && isU2Enabled)
      toggleSwitchAllAlone();
    toggleSwitchU2Alone();
  };
  const toggleSwitchU2Alone = () => setU2IsEnabled((previousState) => !previousState);

  const [isU3Enabled, setU3IsEnabled]= useState(true)
  const toggleSwitchU3 = () => {
    if (isUEnabled&& isU2Enabled)
      toggleSwitchAllAlone();
    toggleSwitchU3Alone();
  };
  const toggleSwitchU3Alone = () => setU3IsEnabled((previousState) => !previousState);

  const [price, setPrice] = useState<Float>()


  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
        <ThemedView style={styles.titleContainer}>
        <View>
          <ThemedText>Titre :</ThemedText>
          <TextInput
            style={styles.txtInput}
            placeholder='Courses, etc.'
          />
        </View>

        <View>
          <ThemedText>Prix :</ThemedText>
          <View style={styles.containerPrice}>
            <TextInput style={styles.txtInputPrice} placeholder='0,00' keyboardType='number-pad'/>
            <RNPickerSelect
            onValueChange = {(value) => setSelectedValueMoney(value)}
            items={[
              { label : "€", value : "euro" },
              { label : "£", value : "livre" },
              { label : "$", value : "dollar" },
            ]}
            style = {pickerMStyle}
            placeholder={{}}
          />
          </View>
        </View>
  
        <View>
          <ThemedText>Payé par:</ThemedText>
          <RNPickerSelect
            onValueChange = {(value) => setSelectedValue(value)}
            items={[
              { label : "Utilisateur 1", value : "option1" },
              { label : "Utilisateur 2", value : "option2" },
              { label : "Utilisateur 3", value : "option3" },
            ]}
            style = {pickerStyle}
            placeholder={{}}
          />
        </View>

        <View style={styles.containerLine}>
          <Switch
            onValueChange={toggleSwitchAll}
            value={isAllEnabled}
          />
          <ThemedText>Partager</ThemedText>
        </View>

        <View style={styles.containerLine}>
          <Switch
            onValueChange={toggleSwitchU}
            value={isUEnabled}
          />
          <ThemedText>Utilisateur 1</ThemedText>
        </View>

        <View style={styles.containerLine}>
          <Switch
            onValueChange={toggleSwitchU2}
            value={isU2Enabled}
          />
          <ThemedText>Utilisateur 2</ThemedText>
        </View>

        <View style={styles.containerLine}>
          <Switch
            onValueChange={toggleSwitchU3}
            value={isU3Enabled}
          />
          <ThemedText>Utilisateur 3</ThemedText>
        </View>

        {/* <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12'
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          Tap the Explore tab to learn more about what's included in this starter app.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          When you're ready, run{' '}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText> */}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  txtInput: {
    borderColor: "black",
    borderWidth: 1,
    backgroundColor: "white",
  },
  txtInputPrice: {
    borderColor: "black",
    borderWidth: 1,
    backgroundColor: "white",
    minWidth: 320
  },
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start"
  },
  containerPrice: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly"
  },
  containerLine: {
    flex: 1,
    flexDirection: "row",
  }
});

const pickerStyle = {
  inputAndroid: {
    fontSize: 11,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "gray",
    color: "black",
    paddingRight: 30,
    backgroundColor: "lightgrey",
  },
  inputIOS: {
    fontSize: 11,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "gray",
    color: "black",
    paddingRight: 30,
    backgroundColor: "lightgrey",
  },
};

const pickerMStyle = {
  inputAndroid: {
    fontSize: 11,
    paddingHorizontal: 50,
    borderWidth: 1,
    borderColor: "white",
    color: "black",
    backgroundColor: "lightgrey",
  },
  inputIOS: {
    fontSize: 11,
    paddingHorizontal: 50,
    borderWidth: 1,
    borderColor: "white",
    color: "black",
    backgroundColor: "lightgrey",
    length: "30px"
  },
}