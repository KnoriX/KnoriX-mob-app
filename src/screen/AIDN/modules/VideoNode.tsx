import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';

import Video from 'react-native-video';

interface VideoNodeProps {
  url: string;
}

const { width, height } = Dimensions.get('window');

const VideoNode = ({
  url,
}: VideoNodeProps) => {
  return (
    <View style={styles.container}>
      <Video
        source={{ uri: url }}
        style={styles.video}
        resizeMode="contain"
        controls={false}
        paused={false}
        repeat={false}
      />
    </View>
  );
};

export default VideoNode;

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
  },

  video: {
    width: '100%',
    height: '100%',
  },
});
