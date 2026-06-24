import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NotebookListScreen from './screens/NotebookListScreen';
import PageListScreen from './screens/PageListScreen';
import PageEditorScreen from './screens/PageEditorScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Notebooks"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Notebooks" component={NotebookListScreen} />
        <Stack.Screen name="Pages" component={PageListScreen} />
        <Stack.Screen name="Editor" component={PageEditorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;