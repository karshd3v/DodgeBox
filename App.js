import React, { Component } from "react";
import { Text, View, Dimensions, Button, Alert, StyleSheet } from "react-native";
import {
  accelerometer,
  setUpdateIntervalForType,
  SensorTypes
} from "react-native-sensors"; //for getting sensor data

import { GameEngine } from "react-native-game-engine";
import Matter from "matter-js";
import randomInt from "random-int";
import randomColor from "randomcolor";

import Circle from "./src/components/Circle";
import Box from "./src/components/Box";
import getRandomDecimal from "./src/helpers/getRandomDecimal";

const { height, width } = Dimensions.get('window');

const BALL_SIZE = 20; // the ball's radius
const DEBRIS_HEIGHT = 70; // the block's height
const DEBRIS_WIDTH = 20; // the block's width

const mid_point = (width / 2) - (BALL_SIZE / 2); // position of the middle part of the screen

const ballSettings = {
  isStatic: true
};

const debrisSettings = { // blocks physical settings
  isStatic: false
};

const ball = Matter.Bodies.circle(0, height - 30, BALL_SIZE, {
  ...ballSettings, // spread the object
  label: "ball" // add label as a property
});

const floor = Matter.Bodies.rectangle(width / 2, height, width, 10, {
  isStatic: true,
  isSensor: true,
  label: "floor"
});

setUpdateIntervalForType(SensorTypes.accelerometer, 15);

export default class App extends Component {

  state = {
    x: 0, // the ball's initial X position
    y: height - 30, // the ball's initial Y position
    isGameReady: false, // game is not ready by default
    score: 0 // the player's score
  }
  constructor(props){
    super(props);
    this.debris = [];
    const { engine, world } = this._addObjectsToWorld(ball);
    this.entities = this._getEntities(engine, world, ball);
    this._setupCollisionHandler(engine);
    this.physics = (entities, { time }) => {
      let engine = entities["physics"].engine; // get the reference to the physics engine
      engine.world.gravity.y = 0.5; // set the gravity of Y axis
      Matter.Engine.update(engine, time.delta); // move the game forward in time
      return entities;
    };
  }
  componentDidMount(){
    accelerometer.subscribe(({ x }) => {
      Matter.Body.setPosition(ball, {
        x: this.state.x + x, 
        y: height - 30 // should be constant
      });
      this.setState(state => ({
        x: x + state.x
      }), () => {
        if (this.state.x < 0 || this.state.x > width) {
          Matter.Body.setPosition(ball, {
            x: mid_point,
            y: height - 30
          });
    
          this.setState({
            x: mid_point
          });
        }
      });
    });
    this.setState({
      isGameReady: true
    });
  }
  componentWillUnmount() {
    this.accelerometer.stop();
  }
  _addObjectsToWorld = (ball)=>{
    const engine = Matter.Engine.create({ enableSleeping: true });
    const world = engine.world;

    let objects = [
      ball,
      floor
    ];

    // create the bodies for the blocks
    for (let x = 0; x <= 5; x++) {
      const debris = Matter.Bodies.rectangle(
        randomInt(1, width - 30), // x position
        randomInt(0, 200), // y position
        DEBRIS_WIDTH,
        DEBRIS_HEIGHT,
        {
          frictionAir: getRandomDecimal(0.01, 0.5),
          label: 'debris'
        }
      );
      this.debris.push(debris);
    }

    objects = objects.concat(this.debris); // add the blocks to the array of objects 
    Matter.World.add(world, objects); // add the objects

    return {
      engine,
      world
    }
  }

  _getEntities = (engine, world, ball) => {
    const entities = {
      physics: {
        engine,
        world
      },
      playerBall: {
        body: ball,
        size: [BALL_SIZE, BALL_SIZE], // width, height
        renderer: Circle
      },
      gameFloor: {
        body: floor,
        size: [width, 10],
        color: '#414448',
        renderer: Box
      }
    };
    for (let x = 0; x <= 5; x++) { // generate the entities for the blocks
      Object.assign(entities, {
        ['debris_' + x]: {
          body: this.debris[x],
          size: [DEBRIS_WIDTH, DEBRIS_HEIGHT],
          color: randomColor({
            luminosity: 'dark', // only generate dark colors so they can be easily seen
          }),
          renderer: Box
        }
      });
    }
    return entities;
  }

  _setupCollisionHandler = (engine) =>{
    Matter.Events.on(engine, "collisionStart", (event) => {
      var pairs = event.pairs;

      var objA = pairs[0].bodyA.label;
      var objB = pairs[0].bodyB.label;

      if(objA === 'floor' && objB === 'debris') {
        Matter.Body.setPosition(pairs[0].bodyB, { // set new initial position for the block
          x: randomInt(1, width - 30),
          y: randomInt(0, 200)
        });

        //increment the player score
        this.setState(state => ({
          score: state.score + 1
        }));
      }

      if (objA === 'ball' && objB === 'debris') {
        Alert.alert('Game Over', 'You lose...');
        this.debris.forEach((debris) => {
          Matter.Body.set(debris, {
            isStatic: true
          });
        });
      }
    });
  }

  render() {
    const { isGameReady, score } = this.state;
    if (isGameReady) {
      return (
        <GameEngine
          style={styles.container}
          systems={[this.physics]}
          entities={this.entities}
        >
          <View style={styles.header}>
          <Button
            onPress={this.reset}
            title="Reset"
            color="#841584"
          />
          <Text style={styles.scoreText}>{score}</Text>
          </View>
        </GameEngine>
      );
    }
    return null;
  }

  reset = () => {
    this.debris.forEach((debris) => { // loop through all the blocks
      Matter.Body.set(debris, {
        isStatic: false // make the block susceptible to gravity again
      });
      Matter.Body.setPosition(debris, { // set new position for the block
        x: randomInt(1, width - 30),
        y: randomInt(0, 200)
      });
    });
    
    this.setState({ 
      score: 0 // reset the player score
    });
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  header: {
    padding: 20,
    alignItems: 'center'
  },
  scoreText: {
    fontSize: 25,
    fontWeight: 'bold'
  }
});