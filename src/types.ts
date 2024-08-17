import type * as _THREE from 'three';
import type * as _GALACEAN from '@galacean/engine';
import type * as _TOOLKIT from '@galacean/engine-toolkit';

import { Vector3 } from "@galacean/engine";

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export class Spherical {
  radius: number;
  phi: number;
  theta: number;

  constructor(radius = 1.0, phi = 0.0, theta = 0.0) {
    this.radius = radius;
    this.phi = phi;
    this.theta = theta;
  }

  clone(): Spherical {
    return new Spherical(this.radius, this.phi, this.theta);
  }

  copy(spherical: Spherical): Spherical {
    this.radius = spherical.radius;
    this.phi = spherical.phi;
    this.theta = spherical.theta;
    return this;
  }

  set(radius: number, phi: number, theta: number): Spherical {
    this.radius = radius;
    this.phi = phi;
    this.theta = theta;
    return this;
  }

  setFromVector3(vec3: Vector3): Spherical {
    this.radius = vec3.length();
    if (this.radius === 0) {
      this.theta = 0;
      this.phi = 0;
    } else {
      this.theta = Math.atan2(vec3.x, vec3.z); // azimuthal angle
      this.phi = Math.acos(clamp(vec3.y / this.radius, -1, 1)); // polar angle
    }
    return this;
  }

  setFromCartesianCoords(x: number, y: number, z: number): Spherical {
    return this.setFromVector3(new Vector3(x, y, z));
  }

  makeSafe(): Spherical {
    const EPS = 0.000001;
    this.phi = Math.max(EPS, Math.min(Math.PI - EPS, this.phi));
    return this;
  }
}

// Is this suppose to be `Pick<typeof THREE, 'MOUSE' | 'Vector2'...>`?
export interface THREESubset { 
	Vector2   : typeof _THREE.Vector2;
	Vector3   : typeof _THREE.Vector3;
	Vector4   : typeof _THREE.Vector4;
	Quaternion: typeof _THREE.Quaternion;
	Matrix4   : typeof _THREE.Matrix4;
	Spherical : typeof _THREE.Spherical;
	Box3      : typeof _THREE.Box3;
	Sphere    : typeof _THREE.Sphere;
	Raycaster : typeof _THREE.Raycaster;
	[ key: string ]: any;
}

export interface GALACEANSubset {
	Vector2   : typeof _GALACEAN.Vector2;
	Vector3   : typeof _GALACEAN.Vector3;
	Vector4   : typeof _GALACEAN.Vector4;
	Quaternion: typeof _GALACEAN.Quaternion;
	Matrix4   : typeof _GALACEAN.Matrix;
	Spherical : typeof Spherical;
	Box3      : typeof _GALACEAN.BoundingBox;
	Sphere    : typeof _GALACEAN.BoundingSphere;
	Raycaster : typeof _GALACEAN.Ray;
	[ key: string ]: any;
}

export type Ref = {
	value: number;
}

// see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons#value
export const MOUSE_BUTTON = {
	LEFT: 1,
	RIGHT: 2,
	MIDDLE: 4,
} as const;
export type MOUSE_BUTTON = typeof MOUSE_BUTTON[ keyof typeof MOUSE_BUTTON ];

export const ACTION = Object.freeze( {
	NONE: 0,
	ROTATE: 1,
	TRUCK: 2,
	OFFSET: 4,
	DOLLY: 8,
	ZOOM: 16,
	TOUCH_ROTATE: 32,
	TOUCH_TRUCK: 64,
	TOUCH_OFFSET: 128,
	TOUCH_DOLLY: 256,
	TOUCH_ZOOM: 512,
	TOUCH_DOLLY_TRUCK: 1024,
	TOUCH_DOLLY_OFFSET: 2048,
	TOUCH_DOLLY_ROTATE: 4096,
	TOUCH_ZOOM_TRUCK: 8192,
	TOUCH_ZOOM_OFFSET: 16384,
	TOUCH_ZOOM_ROTATE: 32768,
} as const );

// Bit OR of Action
export type ACTION = number;

export interface PointerInput {
	pointerId: number;
	clientX: number;
	clientY: number;
	deltaX: number;
	deltaY: number;
	mouseButton: MOUSE_BUTTON | null;
}

type mouseButtonAction = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type mouseWheelAction  = typeof ACTION.ROTATE | typeof ACTION.TRUCK | typeof ACTION.OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type singleTouchAction = typeof ACTION.TOUCH_ROTATE | typeof ACTION.TOUCH_TRUCK | typeof ACTION.TOUCH_OFFSET | typeof ACTION.DOLLY | typeof ACTION.ZOOM | typeof ACTION.NONE;
type multiTouchAction =
	typeof ACTION.TOUCH_DOLLY_ROTATE |
	typeof ACTION.TOUCH_DOLLY_TRUCK |
	typeof ACTION.TOUCH_DOLLY_OFFSET |
	typeof ACTION.TOUCH_ZOOM_ROTATE |
	typeof ACTION.TOUCH_ZOOM_TRUCK |
	typeof ACTION.TOUCH_ZOOM_OFFSET |
	typeof ACTION.TOUCH_DOLLY |
	typeof ACTION.TOUCH_ZOOM |
	typeof ACTION.TOUCH_ROTATE |
	typeof ACTION.TOUCH_TRUCK |
	typeof ACTION.TOUCH_OFFSET |
	typeof ACTION.NONE;

export interface MouseButtons {
	left     : mouseButtonAction;
	middle   : mouseButtonAction;
	right    : mouseButtonAction;
	wheel    : mouseWheelAction;
}

export interface Touches {
	one  : singleTouchAction;
	two  : multiTouchAction;
	three: multiTouchAction;
}

export const DOLLY_DIRECTION = {
	NONE: 0,
	IN: 1,
	OUT: - 1,
} as const;
export type DOLLY_DIRECTION = typeof DOLLY_DIRECTION[ keyof typeof DOLLY_DIRECTION ];

export interface FitToOptions {
	cover: boolean;
	paddingLeft  : number;
	paddingRight : number;
	paddingBottom: number;
	paddingTop   : number;
}

export interface CameraControlsEventMap {
	update         : { type: 'update' };
	wake           : { type: 'wake' };
	rest           : { type: 'rest' };
	sleep          : { type: 'sleep' };
	transitionstart: { type: 'transitionstart' };
	controlstart   : { type: 'controlstart' };
	control        : { type: 'control' };
	controlend     : { type: 'controlend' };
}

export function isPerspectiveCamera( camera: _GALACEAN.Camera ) {
	return camera.isOrthographic === false;

}

export function isOrthographicCamera( camera: _GALACEAN.Camera ) {
	return camera.isOrthographic;
}
