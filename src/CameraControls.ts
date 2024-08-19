import { traverseEntity } from './utils/traverseEntity';
import type * as _THREE from 'three';
import type * as _GALACEAN from '@galacean/engine';
import { WebGLEngine, Engine, Vector3, Vector2, Vector4, BoundingBox, Quaternion, Matrix, Camera, BoundingSphere, Entity, MeshRenderer } from '@galacean/engine'
import { LitePhysics } from '@galacean/engine-physics-lite'

import {
	THREESubset,
	GALACEANSubset,
	Ref,
	MOUSE_BUTTON,
	ACTION,
	DOLLY_DIRECTION,
	PointerInput,
	MouseButtons,
	Touches,
	FitToOptions,
	CameraControlsEventMap,
	isPerspectiveCamera,
	isOrthographicCamera,
	Spherical,
	setFromUnitVectors,
} from './types';
import {
	PI_2,
	PI_HALF,
} from './constants';
import {
	DEG2RAD,
	clamp,
	approxZero,
	approxEquals,
	roundToStep,
	infinityToMaxNumber,
	maxNumberToInfinity,
	smoothDamp,
	smoothDampVec3,
} from './utils/math-utils';
import { extractClientCoordFromEvent } from './utils/extractClientCoordFromEvent';
import { notSupportedInOrthographicCamera } from './utils/notSupportedInOrthographicCamera';
import { EventDispatcher, Listener } from './EventDispatcher';

const VERSION = '__VERSION'; // will be replaced with `version` in package.json during the build process.
const TOUCH_DOLLY_FACTOR = 1 / 8;
const isMac = /Mac/.test( globalThis?.navigator?.platform );

// let THREE: THREESubset;
// let _ORIGIN: Vector3;
// let _AXIS_Y: Vector3;
// let _AXIS_Z: Vector3;
// let _v2: _THREE.Vector2;
// let _v3A: Vector3;
// let _v3B: Vector3;
// let _v3C: Vector3;
// let _cameraDirection: Vector3;
// let _xColumn: Vector3;
// let _yColumn: Vector3;
// let _zColumn: Vector3;
// let _deltaTarget: Vector3;
// let _deltaOffset: Vector3;
// let _sphericalA: _THREE.Spherical;
// let _sphericalB: _THREE.Spherical;
// let _box3A: BoundingBox;
// let _box3B: BoundingBox;
// let _sphere: _THREE.Sphere;
// let _quaternionA: _THREE.Quaternion;
// let _quaternionB: _THREE.Quaternion;
// let _rotationMatrix: _THREE.Matrix4;
// let _raycaster: _THREE.Raycaster;

let GALACEAN: GALACEANSubset;
let _ORIGIN: _GALACEAN.Vector3;
let _AXIS_Y: _GALACEAN.Vector3;
let _AXIS_Z: _GALACEAN.Vector3;
let _v2: _GALACEAN.Vector2;
let _v3A: _GALACEAN.Vector3;
let _v3B: _GALACEAN.Vector3;
let _v3C: _GALACEAN.Vector3;
let _cameraDirection: _GALACEAN.Vector3;
let _xColumn: _GALACEAN.Vector3;
let _yColumn: _GALACEAN.Vector3;
let _zColumn: _GALACEAN.Vector3;
let _deltaTarget: _GALACEAN.Vector3;
let _deltaOffset: _GALACEAN.Vector3;
let _sphericalA: Spherical;
let _sphericalB: Spherical;
let _box3A: _GALACEAN.BoundingBox;
let _box3B: _GALACEAN.BoundingBox;
let _sphere: _GALACEAN.BoundingSphere;
let _quaternionA: _GALACEAN.Quaternion;
let _quaternionB: _GALACEAN.Quaternion;
let _rotationMatrix: _GALACEAN.Matrix;
let _raycaster: _THREE.Raycaster;

export class CameraControls extends EventDispatcher {

	/**
	 * Injects THREE as the dependency. You can then proceed to use CameraControls.
	 *
	 * e.g
	 * ```javascript
	 * CameraControls.install( { THREE: THREE } );
	 * ```
	 *
	 * Note: If you do not wish to use enter three.js to reduce file size(tree-shaking for example), make a subset to install.
	 *
	 * ```js
	 * import {
	 * 	Vector2,
	 * 	Vector3,
	 * 	Vector4,
	 * 	Quaternion,
	 * 	Matrix4,
	 * 	Spherical,
	 * 	Box3,
	 * 	Sphere,
	 * 	Raycaster,
	 * 	MathUtils,
	 * } from 'three';
	 *
	 * const subsetOfTHREE = {
	 * 	Vector2   : Vector2,
	 * 	Vector3   : Vector3,
	 * 	Vector4   : Vector4,
	 * 	Quaternion: Quaternion,
	 * 	Matrix4   : Matrix4,
	 * 	Spherical : Spherical,
	 * 	Box3      : Box3,
	 * 	Sphere    : Sphere,
	 * 	Raycaster : Raycaster,
	 * };

	 * CameraControls.install( { THREE: subsetOfTHREE } );
	 * ```
	 * @category Statics
	 */
	static async install( libs: { GALACEAN: GALACEANSubset } ) {

		GALACEAN = libs.GALACEAN;

		const engine = await WebGLEngine.create({
			canvas: document.createElement('canvas'),
			physics: new LitePhysics(),
		});

		engine.sceneManager.scenes[0].physics.raycast


		_ORIGIN = Object.freeze( new Vector3( 0, 0, 0 ) );
		_AXIS_Y = Object.freeze( new Vector3( 0, 1, 0 ) );
		_AXIS_Z = Object.freeze( new Vector3( 0, 0, 1 ) );
		_v2 = new Vector2();
		_v3A = new Vector3();
		_v3B = new Vector3();
		_v3C = new Vector3();
		_cameraDirection = new Vector3();
		_xColumn = new Vector3();
		_yColumn = new Vector3();
		_zColumn = new Vector3();
		_deltaTarget = new Vector3();
		_deltaOffset = new Vector3();
		_sphericalA = new Spherical();
		_sphericalB = new Spherical();
		_box3A = new BoundingBox();
		_box3B = new BoundingBox();
		_sphere = new GALACEAN.Sphere();
		_quaternionA = new Quaternion();
		_quaternionB = new Quaternion();
		_rotationMatrix = new Matrix();
		// _raycaster = new THREE.Raycaster();
	}

	/**
	 * list all ACTIONs
	 * @category Statics
	 */
	static get ACTION(): typeof ACTION {

		return ACTION;

	}

	/**
	 * Minimum vertical angle in radians.  
	 * The angle has to be between `0` and `.maxPolarAngle` inclusive.  
	 * The default value is `0`.
	 *
	 * e.g.
	 * ```
	 * cameraControls.maxPolarAngle = 0;
	 * ```
	 * @category Properties
	 */
	minPolarAngle = 0; // radians

	/**
	 * Maximum vertical angle in radians.  
	 * The angle has to be between `.maxPolarAngle` and `Math.PI` inclusive.  
	 * The default value is `Math.PI`.
	 *
	 * e.g.
	 * ```
	 * cameraControls.maxPolarAngle = Math.PI;
	 * ```
	 * @category Properties
	 */
	maxPolarAngle = Math.PI; // radians

	/**
	 * Minimum horizontal angle in radians.  
	 * The angle has to be less than `.maxAzimuthAngle`.  
	 * The default value is `- Infinity`.
	 *
	 * e.g.
	 * ```
	 * cameraControls.minAzimuthAngle = - Infinity;
	 * ```
	 * @category Properties
	 */
	minAzimuthAngle = - Infinity; // radians

	/**
	 * Maximum horizontal angle in radians.  
	 * The angle has to be greater than `.minAzimuthAngle`.  
	 * The default value is `Infinity`.
	 *
	 * e.g.
	 * ```
	 * cameraControls.maxAzimuthAngle = Infinity;
	 * ```
	 * @category Properties
	 */
	maxAzimuthAngle = Infinity; // radians

	// How far you can dolly in and out ( PerspectiveCamera only )
	/**
	 * Minimum distance for dolly. The value must be higher than `0`. Default is `Number.EPSILON`.  
	 * PerspectiveCamera only.
	 * @category Properties
	 */
	minDistance = Number.EPSILON;

	/**
	 * Maximum distance for dolly. The value must be higher than `minDistance`. Default is `Infinity`.  
	 * PerspectiveCamera only.
	 * @category Properties
	 */
	maxDistance = Infinity;

	/**
	 * `true` to enable Infinity Dolly for wheel and pinch. Use this with `minDistance` and `maxDistance`  
	 * If the Dolly distance is less (or over) than the `minDistance` (or `maxDistance`), `infinityDolly` will keep the distance and pushes the target position instead.
	 * @category Properties
	 */
	infinityDolly = false;

	/**
	 * Minimum camera zoom.
	 * @category Properties
	 */
	minZoom = 0.01;

	/**
	 * Maximum camera zoom.
	 * @category Properties
	 */
	maxZoom = Infinity;

	/**
	 * Approximate time in seconds to reach the target. A smaller value will reach the target faster.
	 * @category Properties
	 */
	smoothTime = 0.25;

	/**
	 * the smoothTime while dragging
	 * @category Properties
	 */
	draggingSmoothTime = 0.125;

	/**
	 * Max transition speed in unit-per-seconds
	 * @category Properties
	 */
	maxSpeed = Infinity;

	/**
	 * Speed of azimuth (horizontal) rotation.
	 * @category Properties
	 */
	azimuthRotateSpeed = 1.0;
	/**
	 * Speed of polar (vertical) rotation.
	 * @category Properties
	 */
	polarRotateSpeed = 1.0;
	/**
	 * Speed of mouse-wheel dollying.
	 * @category Properties
	 */
	dollySpeed = 1.0;

	/**
	 * `true` to invert direction when dollying or zooming via drag
	 * @category Properties
	 */
	dollyDragInverted = false;

	/**
	 * Speed of drag for truck and pedestal.
	 * @category Properties
	 */
	truckSpeed = 2.0;

	/**
	 * `true` to enable Dolly-in to the mouse cursor coords.
	 * @category Properties
	 */
	dollyToCursor = false;

	/**
	 * @category Properties
	 */
	dragToOffset = false;

	/**
	 * The same as `.screenSpacePanning` in three.js's OrbitControls.
	 * @category Properties
	 */
	verticalDragToForward = false;

	/**
	 * Friction ratio of the boundary.
	 * @category Properties
	 */
	boundaryFriction = 0.0;

	/**
	 * Controls how soon the `rest` event fires as the camera slows.
	 * @category Properties
	 */
	restThreshold = 0.01;

	/**
	 * An array of Meshes to collide with camera.  
	 * Be aware colliderMeshes may decrease performance. The collision test uses 4 raycasters from the camera since the near plane has 4 corners.
	 * @category Properties
	 */
	colliderMeshes: _THREE.Object3D[] = [];

	// button configs
	/**
	 * User's mouse input config.
	 *
	 * | button to assign      | behavior |
	 * | --------------------- | -------- |
	 * | `mouseButtons.left`   | `CameraControls.ACTION.ROTATE`* \| `CameraControls.ACTION.TRUCK` \| `CameraControls.ACTION.OFFSET` \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
	 * | `mouseButtons.right`  | `CameraControls.ACTION.ROTATE` \| `CameraControls.ACTION.TRUCK`* \| `CameraControls.ACTION.OFFSET` \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
	 * | `mouseButtons.wheel` ¹ | `CameraControls.ACTION.ROTATE` \| `CameraControls.ACTION.TRUCK` \| `CameraControls.ACTION.OFFSET` \| `CameraControls.ACTION.DOLLY` \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
	 * | `mouseButtons.middle` ² | `CameraControls.ACTION.ROTATE` \| `CameraControls.ACTION.TRUCK` \| `CameraControls.ACTION.OFFSET` \| `CameraControls.ACTION.DOLLY`* \| `CameraControls.ACTION.ZOOM` \| `CameraControls.ACTION.NONE` |
	 *
	 * 1. Mouse wheel event for scroll "up/down" on mac "up/down/left/right"
	 * 2. Mouse click on wheel event "button"
	 * - \* is the default.
	 * - The default of `mouseButtons.wheel` is:
	 *   - `DOLLY` for Perspective camera.
	 *   - `ZOOM` for Orthographic camera, and can't set `DOLLY`.
	 * @category Properties
	 */
	mouseButtons: MouseButtons;

	/**
	 * User's touch input config.
	 *
	 * | fingers to assign     | behavior |
	 * | --------------------- | -------- |
	 * | `touches.one` | `CameraControls.ACTION.TOUCH_ROTATE`* \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.TOUCH_OFFSET` \| `CameraControls.ACTION.DOLLY` | `CameraControls.ACTION.ZOOM` | `CameraControls.ACTION.NONE` |
	 * | `touches.two` | `ACTION.TOUCH_DOLLY_TRUCK` \| `ACTION.TOUCH_DOLLY_OFFSET` \| `ACTION.TOUCH_DOLLY_ROTATE` \| `ACTION.TOUCH_ZOOM_TRUCK` \| `ACTION.TOUCH_ZOOM_OFFSET` \| `ACTION.TOUCH_ZOOM_ROTATE` \| `ACTION.TOUCH_DOLLY` \| `ACTION.TOUCH_ZOOM` \| `CameraControls.ACTION.TOUCH_ROTATE` \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.TOUCH_OFFSET` \| `CameraControls.ACTION.NONE` |
	 * | `touches.three` | `ACTION.TOUCH_DOLLY_TRUCK` \| `ACTION.TOUCH_DOLLY_OFFSET` \| `ACTION.TOUCH_DOLLY_ROTATE` \| `ACTION.TOUCH_ZOOM_TRUCK` \| `ACTION.TOUCH_ZOOM_OFFSET` \| `ACTION.TOUCH_ZOOM_ROTATE` \| `CameraControls.ACTION.TOUCH_ROTATE` \| `CameraControls.ACTION.TOUCH_TRUCK` \| `CameraControls.ACTION.TOUCH_OFFSET` \| `CameraControls.ACTION.NONE` |
	 *
	 * - \* is the default.
	 * - The default of `touches.two` and `touches.three` is:
	 *   - `TOUCH_DOLLY_TRUCK` for Perspective camera.
	 *   - `TOUCH_ZOOM_TRUCK` for Orthographic camera, and can't set `TOUCH_DOLLY_TRUCK` and `TOUCH_DOLLY`.
	 * @category Properties
	 */
	touches: Touches;

	/**
	 * Force cancel user dragging.
	 * @category Methods
	 */
	// cancel will be overwritten in the constructor.
	cancel: () => void = () => {};

	/**
	 * Still an experimental feature.
	 * This could change at any time.
	 * @category Methods
	 */
	lockPointer: () => void;

	/**
	 * Still an experimental feature.
	 * This could change at any time.
	 * @category Methods
	 */
	unlockPointer: () => void;

	protected _enabled = true;
	// protected _camera: _THREE.PerspectiveCamera | _THREE.OrthographicCamera;
	protected _camera: Camera;
	protected _yAxisUpSpace: Quaternion;
	protected _yAxisUpSpaceInverse: Quaternion;
	protected _state: ACTION = ACTION.NONE;

	protected _domElement?: HTMLElement;
	protected _viewport: Vector4 | null = null;

	// the location of focus, where the object orbits around
	protected _target: Vector3;
	protected _targetEnd: Vector3;

	protected _focalOffset: Vector3;
	protected _focalOffsetEnd: Vector3;

	// rotation and dolly distance
	protected _spherical: Spherical;
	protected _sphericalEnd: Spherical;
	protected _lastDistance: number;

	protected _zoom: number;
	protected _zoomEnd: number;
	protected _lastZoom: number;

	// reset
	protected _cameraUp0: Vector3;
	protected _target0: Vector3;
	protected _position0: Vector3;
	protected _zoom0: number;
	protected _focalOffset0: Vector3;

	protected _dollyControlCoord: Vector2;
	protected _changedDolly = 0;
	protected _changedZoom = 0;

	// collisionTest uses nearPlane. ( PerspectiveCamera only )
	protected _nearPlaneCorners: [ Vector3, Vector3, Vector3, Vector3 ];

	protected _hasRested = true;

	protected _boundary: BoundingBox;
	protected _boundaryEnclosesCamera = false;

	protected _needsUpdate = true;
	protected _updatedLastTime = false;
	protected _elementRect = new DOMRect();

	protected _isDragging = false;
	protected _dragNeedsUpdate = true;
	protected _activePointers: PointerInput[] = [];
	protected _lockedPointer: PointerInput | null = null;
	protected _interactiveArea = new DOMRect( 0, 0, 1, 1 );

	// Use draggingSmoothTime over smoothTime while true.
	// set automatically true on user-dragging start.
	// set automatically false on programmable methods call.
	protected _isUserControllingRotate: boolean = false;
	protected _isUserControllingDolly: boolean = false;
	protected _isUserControllingTruck: boolean = false;
	protected _isUserControllingOffset: boolean = false;
	protected _isUserControllingZoom: boolean = false;
	protected _lastDollyDirection: DOLLY_DIRECTION = DOLLY_DIRECTION.NONE;

	// velocities for smoothDamp
	protected _thetaVelocity: Ref = { value: 0 };
	protected _phiVelocity: Ref = { value: 0 };
	protected _radiusVelocity: Ref = { value: 0 };
	protected _targetVelocity: Vector3 = new Vector3();
	protected _focalOffsetVelocity: Vector3 = new Vector3();
	protected _zoomVelocity: Ref = { value: 0 };

	/**
	 * Creates a `CameraControls` instance.
	 *
	 * Note:
	 * You **must install** three.js before using camera-controls. see [#install](#install)
	 * Not doing so will lead to runtime errors (`undefined` references to THREE).
	 *
	 * e.g.
	 * ```
	 * CameraControls.install( { THREE } );
	 * const cameraControls = new CameraControls( camera, domElement );
	 * ```
	 *
	 * @param camera A `THREE.PerspectiveCamera` or `THREE.OrthographicCamera` to be controlled.
	 * @param domElement A `HTMLElement` for the draggable area, usually `renderer.domElement`.
	 * @category Constructor
	 */
	constructor(
		camera: Camera,
		domElement?: HTMLElement,
	) {

		super();

		this._camera = camera;
		// this._yAxisUpSpace = new Quaternion().setFromUnitVectors( this.camera.entity.transform.worldUp, _AXIS_Y );
		this._yAxisUpSpace = new Quaternion();

		this._yAxisUpSpaceInverse = this._yAxisUpSpace.clone().invert();
		this._state = ACTION.NONE;

		// the location
		this._target = new Vector3();
		this._targetEnd = this._target.clone();

		this._focalOffset = new Vector3();
		this._focalOffsetEnd = this._focalOffset.clone();

		// rotation
		const _v3 = new Vector3().copyFrom(this._camera.entity.transform.position);
		_v3.transformByQuat(this._yAxisUpSpace);
		this._spherical = new Spherical().setFromVector3(_v3);
		this._sphericalEnd = this._spherical.clone();
		this._lastDistance = this._spherical.radius;

		this._zoom = this._camera.zoom;
		this._zoomEnd = this._zoom;
		this._lastZoom = this._zoom;

		// collisionTest uses nearPlane.s
		this._nearPlaneCorners = [
			new Vector3(),
			new Vector3(),
			new Vector3(),
			new Vector3(),
		];
		this._updateNearPlaneCorners();

		// Target cannot move outside of this box
		// this._boundary = new THREE.Box3(
		// 	new THREE.Vector3( - Infinity, - Infinity, - Infinity ),
		// 	new THREE.Vector3(   Infinity,   Infinity,   Infinity ),
		// );

		this._boundary = new BoundingBox(
			new Vector3( - Infinity, - Infinity, - Infinity ),
			new Vector3(   Infinity,   Infinity,   Infinity ),
		);

		// reset
		this._cameraUp0 = this.camera.entity.transform.worldUp.clone();
		this._target0 = this._target.clone();
		this._position0 = this._camera.entity.transform.position.clone();
		this._zoom0 = this._zoom;
		this._focalOffset0 = this._focalOffset.clone();

		this._dollyControlCoord = new Vector2();

		// configs
		this.mouseButtons = {
			left: ACTION.ROTATE,
			middle: ACTION.DOLLY,
			right: ACTION.TRUCK,
			wheel:
				isPerspectiveCamera( this._camera )  ? ACTION.DOLLY :
				isOrthographicCamera( this._camera ) ? ACTION.ZOOM :
				ACTION.NONE,
		};

		this.touches = {
			one: ACTION.TOUCH_ROTATE,
			two:
				isPerspectiveCamera( this._camera )  ? ACTION.TOUCH_DOLLY_TRUCK :
				isOrthographicCamera( this._camera ) ? ACTION.TOUCH_ZOOM_TRUCK :
				ACTION.NONE,
			three: ACTION.TOUCH_TRUCK,
		};

		const dragStartPosition = new Vector2();
		const lastDragPosition = new Vector2();
		const dollyStart = new Vector2();

		const onPointerDown = ( event: PointerEvent ) => {

			if ( ! this._enabled || ! this._domElement ) return;

			if (
				this._interactiveArea.left !== 0 ||
				this._interactiveArea.top !== 0 ||
				this._interactiveArea.width !== 1 ||
				this._interactiveArea.height !== 1
			) {

				const elRect = this._domElement.getBoundingClientRect();
				const left = event.clientX / elRect.width;
				const top = event.clientY / elRect.height;

				// check if the interactiveArea contains the drag start position.
				if (
					left < this._interactiveArea.left ||
					left > this._interactiveArea.right ||
					top < this._interactiveArea.top ||
					top > this._interactiveArea.bottom
				) return;

			}

			// Don't call `event.preventDefault()` on the pointerdown event
			// to keep receiving pointermove evens outside dragging iframe
			// https://taye.me/blog/tips/2015/11/16/mouse-drag-outside-iframe/

			const mouseButton =
				event.pointerType !== 'mouse' ? null :
				( event.buttons & MOUSE_BUTTON.LEFT ) === MOUSE_BUTTON.LEFT ? MOUSE_BUTTON.LEFT :
				( event.buttons & MOUSE_BUTTON.MIDDLE ) === MOUSE_BUTTON.MIDDLE ? MOUSE_BUTTON.MIDDLE :
				( event.buttons & MOUSE_BUTTON.RIGHT ) === MOUSE_BUTTON.RIGHT ? MOUSE_BUTTON.RIGHT :
				null;

			if ( mouseButton !== null ) {

				const zombiePointer = this._findPointerByMouseButton( mouseButton );
				zombiePointer && this._disposePointer( zombiePointer );

			}

			if ( ( event.buttons & MOUSE_BUTTON.LEFT ) === MOUSE_BUTTON.LEFT && this._lockedPointer ) return;

			const pointer = {
				pointerId: event.pointerId,
				clientX: event.clientX,
				clientY: event.clientY,
				deltaX: 0,
				deltaY: 0,
				mouseButton,
			};
			this._activePointers.push( pointer );

			// eslint-disable-next-line no-undef
			this._domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, { passive: false } as AddEventListenerOptions );
			this._domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

			this._domElement.ownerDocument.addEventListener( 'pointermove', onPointerMove, { passive: false } );
			this._domElement.ownerDocument.addEventListener( 'pointerup', onPointerUp );

			this._isDragging = true;
			startDragging( event );

		};

		const onPointerMove = ( event: PointerEvent ) => {

			if ( event.cancelable ) event.preventDefault();

			const pointerId = event.pointerId;
			const pointer = this._lockedPointer || this._findPointerById( pointerId );

			if ( ! pointer ) return;

			pointer.clientX = event.clientX;
			pointer.clientY = event.clientY;
			pointer.deltaX = event.movementX;
			pointer.deltaY = event.movementY;

			this._state = 0;

			if ( event.pointerType === 'touch' ) {

				switch ( this._activePointers.length ) {

					case 1:

						this._state = this.touches.one;
						break;

					case 2:

						this._state = this.touches.two;
						break;

					case 3:

						this._state = this.touches.three;
						break;

				}

			} else {

				if (
					( ! this._isDragging && this._lockedPointer ) ||
					this._isDragging && ( event.buttons & MOUSE_BUTTON.LEFT ) === MOUSE_BUTTON.LEFT
				) {

					this._state = this._state | this.mouseButtons.left;

				}

				if ( this._isDragging && ( event.buttons & MOUSE_BUTTON.MIDDLE ) === MOUSE_BUTTON.MIDDLE ) {

					this._state = this._state | this.mouseButtons.middle;

				}

				if ( this._isDragging && ( event.buttons & MOUSE_BUTTON.RIGHT ) === MOUSE_BUTTON.RIGHT ) {

					this._state = this._state | this.mouseButtons.right;

				}

			}

			dragging();

		};

		const onPointerUp = ( event: PointerEvent ) => {

			const pointer = this._findPointerById( event.pointerId );

			if ( pointer && pointer === this._lockedPointer ) return;

			pointer && this._disposePointer( pointer );

			if ( event.pointerType === 'touch' ) {

				switch ( this._activePointers.length ) {

					case 0:

						this._state = ACTION.NONE;
						break;

					case 1:

						this._state = this.touches.one;
						break;

					case 2:

						this._state = this.touches.two;
						break;

					case 3:

						this._state = this.touches.three;
						break;

				}

			} else {

				this._state = ACTION.NONE;

			}

			endDragging();

		};

		let lastScrollTimeStamp = - 1;

		const onMouseWheel = ( event: WheelEvent ): void => {

			if ( ! this._domElement ) return;
			if ( ! this._enabled || this.mouseButtons.wheel === ACTION.NONE ) return;

			if (
				this._interactiveArea.left !== 0 ||
				this._interactiveArea.top !== 0 ||
				this._interactiveArea.width !== 1 ||
				this._interactiveArea.height !== 1
			) {

				const elRect = this._domElement.getBoundingClientRect();
				const left = event.clientX / elRect.width;
				const top = event.clientY / elRect.height;

				// check if the interactiveArea contains the drag start position.
				if (
					left < this._interactiveArea.left ||
					left > this._interactiveArea.right ||
					top < this._interactiveArea.top ||
					top > this._interactiveArea.bottom
				) return;

			}

			event.preventDefault();

			if (
				this.dollyToCursor ||
				this.mouseButtons.wheel === ACTION.ROTATE ||
				this.mouseButtons.wheel === ACTION.TRUCK
			) {

				const now = performance.now();

				// only need to fire this at scroll start.
				if ( lastScrollTimeStamp - now < 1000 ) this._getClientRect( this._elementRect );
				lastScrollTimeStamp = now;

			}

			// Ref: https://github.com/cedricpinson/osgjs/blob/00e5a7e9d9206c06fdde0436e1d62ab7cb5ce853/sources/osgViewer/input/source/InputSourceMouse.js#L89-L103
			const deltaYFactor = isMac ? - 1 : - 3;
			const delta = ( event.deltaMode === 1 ) ? event.deltaY / deltaYFactor : event.deltaY / ( deltaYFactor * 10 );
			const x = this.dollyToCursor ? ( event.clientX - this._elementRect.x ) / this._elementRect.width  *   2 - 1 : 0;
			const y = this.dollyToCursor ? ( event.clientY - this._elementRect.y ) / this._elementRect.height * - 2 + 1 : 0;

			switch ( this.mouseButtons.wheel ) {

				case ACTION.ROTATE: {

					this._rotateInternal( event.deltaX, event.deltaY );
					this._isUserControllingRotate = true;
					break;

				}

				case ACTION.TRUCK: {

					this._truckInternal( event.deltaX, event.deltaY, false );
					this._isUserControllingTruck = true;
					break;

				}

				case ACTION.OFFSET: {

					this._truckInternal( event.deltaX, event.deltaY, true );
					this._isUserControllingOffset = true;
					break;

				}

				case ACTION.DOLLY: {

					this._dollyInternal( - delta, x, y );
					this._isUserControllingDolly = true;
					break;

				}

				case ACTION.ZOOM: {

					this._zoomInternal( - delta, x, y );
					this._isUserControllingZoom = true;
					break;

				}

			}

			this.dispatchEvent( { type: 'control' } );

		};

		const onContextMenu = ( event: Event ): void => {

			if ( ! this._domElement || ! this._enabled ) return;

			// contextmenu event is fired right after pointerdown
			// remove attached handlers and active pointer, if interrupted by contextmenu.
			if ( this.mouseButtons.right === CameraControls.ACTION.NONE ) {

				const pointerId = event instanceof PointerEvent ? event.pointerId : 0;

				const pointer = this._findPointerById( pointerId );
				pointer && this._disposePointer( pointer );

				// eslint-disable-next-line no-undef
				this._domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, { passive: false } as AddEventListenerOptions );
				this._domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

				return;

			}

			event.preventDefault();

		};

		const startDragging = ( event?: PointerEvent ): void => {

			if ( ! this._enabled ) return;

			extractClientCoordFromEvent( this._activePointers, _v2 );

			this._getClientRect( this._elementRect );
			dragStartPosition.copyFrom( _v2 );
			lastDragPosition.copyFrom( _v2 );

			const isMultiTouch = this._activePointers.length >= 2;

			if ( isMultiTouch ) {

				// 2 finger pinch
				const dx = _v2.x - this._activePointers[ 1 ].clientX;
				const dy = _v2.y - this._activePointers[ 1 ].clientY;
				const distance = Math.sqrt( dx * dx + dy * dy );

				dollyStart.set( 0, distance );

				// center coords of 2 finger truck
				const x = ( this._activePointers[ 0 ].clientX + this._activePointers[ 1 ].clientX ) * 0.5;
				const y = ( this._activePointers[ 0 ].clientY + this._activePointers[ 1 ].clientY ) * 0.5;

				lastDragPosition.set( x, y );

			}

			this._state = 0;

			if ( ! event ) {

				if ( this._lockedPointer ) this._state = this._state | this.mouseButtons.left;

			} else if ( 'pointerType' in event && event.pointerType === 'touch' ) {

				switch ( this._activePointers.length ) {

					case 1:

						this._state = this.touches.one;
						break;

					case 2:

						this._state = this.touches.two;
						break;

					case 3:

						this._state = this.touches.three;
						break;

				}

			} else {

				if ( ! this._lockedPointer && ( event.buttons & MOUSE_BUTTON.LEFT ) === MOUSE_BUTTON.LEFT ) {

					this._state = this._state | this.mouseButtons.left;

				}

				if ( ( event.buttons & MOUSE_BUTTON.MIDDLE ) === MOUSE_BUTTON.MIDDLE ) {

					this._state = this._state | this.mouseButtons.middle;

				}

				if ( ( event.buttons & MOUSE_BUTTON.RIGHT ) === MOUSE_BUTTON.RIGHT ) {

					this._state = this._state | this.mouseButtons.right;

				}

			}

			// stop current movement on drag start
			if (
				( this._state & ACTION.ROTATE ) === ACTION.ROTATE ||
				( this._state & ACTION.TOUCH_ROTATE ) === ACTION.TOUCH_ROTATE ||
				( this._state & ACTION.TOUCH_DOLLY_ROTATE ) === ACTION.TOUCH_DOLLY_ROTATE ||
				( this._state & ACTION.TOUCH_ZOOM_ROTATE ) === ACTION.TOUCH_ZOOM_ROTATE
			) {

				this._sphericalEnd.theta = this._spherical.theta;
				this._sphericalEnd.phi = this._spherical.phi;
				this._thetaVelocity.value = 0;
				this._phiVelocity.value = 0;

			}

			if (
				( this._state & ACTION.TRUCK ) === ACTION.TRUCK ||
				( this._state & ACTION.TOUCH_TRUCK ) === ACTION.TOUCH_TRUCK ||
				( this._state & ACTION.TOUCH_DOLLY_TRUCK ) === ACTION.TOUCH_DOLLY_TRUCK ||
				( this._state & ACTION.TOUCH_ZOOM_TRUCK ) === ACTION.TOUCH_ZOOM_TRUCK
			) {

				this._targetEnd.copyFrom( this._target );
				this._targetVelocity.set( 0, 0, 0 );

			}

			if (
				( this._state & ACTION.DOLLY ) === ACTION.DOLLY ||
				( this._state & ACTION.TOUCH_DOLLY ) === ACTION.TOUCH_DOLLY ||
				( this._state & ACTION.TOUCH_DOLLY_TRUCK ) === ACTION.TOUCH_DOLLY_TRUCK ||
				( this._state & ACTION.TOUCH_DOLLY_OFFSET ) === ACTION.TOUCH_DOLLY_OFFSET ||
				( this._state & ACTION.TOUCH_DOLLY_ROTATE ) === ACTION.TOUCH_DOLLY_ROTATE
			) {

				this._sphericalEnd.radius = this._spherical.radius;
				this._radiusVelocity.value = 0;

			}

			if (
				( this._state & ACTION.ZOOM ) === ACTION.ZOOM ||
				( this._state & ACTION.TOUCH_ZOOM ) === ACTION.TOUCH_ZOOM ||
				( this._state & ACTION.TOUCH_ZOOM_TRUCK ) === ACTION.TOUCH_ZOOM_TRUCK ||
				( this._state & ACTION.TOUCH_ZOOM_OFFSET ) === ACTION.TOUCH_ZOOM_OFFSET ||
				( this._state & ACTION.TOUCH_ZOOM_ROTATE ) === ACTION.TOUCH_ZOOM_ROTATE
			) {

				this._zoomEnd = this._zoom;
				this._zoomVelocity.value = 0;

			}

			if (
				( this._state & ACTION.OFFSET ) === ACTION.OFFSET ||
				( this._state & ACTION.TOUCH_OFFSET ) === ACTION.TOUCH_OFFSET ||
				( this._state & ACTION.TOUCH_DOLLY_OFFSET ) === ACTION.TOUCH_DOLLY_OFFSET ||
				( this._state & ACTION.TOUCH_ZOOM_OFFSET ) === ACTION.TOUCH_ZOOM_OFFSET
			) {

				this._focalOffsetEnd.copyFrom( this._focalOffset );
				this._focalOffsetVelocity.set( 0, 0, 0 );

			}

			this.dispatchEvent( { type: 'controlstart' } );

		};

		const dragging = (): void => {

			if ( ! this._enabled || ! this._dragNeedsUpdate ) return;
			this._dragNeedsUpdate = false;

			extractClientCoordFromEvent( this._activePointers, _v2 );

			// When pointer lock is enabled clientX, clientY, screenX, and screenY remain 0.
			// If pointer lock is enabled, use the Delta directory, and assume active-pointer is not multiple.
			const isPointerLockActive = this._domElement && this._domElement.ownerDocument.pointerLockElement === this._domElement;
			const lockedPointer = isPointerLockActive ? this._lockedPointer || this._activePointers[ 0 ] : null;
			const deltaX = lockedPointer ? - lockedPointer.deltaX : lastDragPosition.x - _v2.x;
			const deltaY = lockedPointer ? - lockedPointer.deltaY : lastDragPosition.y - _v2.y;

			lastDragPosition.copyFrom( _v2 );

			if (
				( this._state & ACTION.ROTATE ) === ACTION.ROTATE ||
				( this._state & ACTION.TOUCH_ROTATE ) === ACTION.TOUCH_ROTATE ||
				( this._state & ACTION.TOUCH_DOLLY_ROTATE ) === ACTION.TOUCH_DOLLY_ROTATE ||
				( this._state & ACTION.TOUCH_ZOOM_ROTATE ) === ACTION.TOUCH_ZOOM_ROTATE
			) {

				this._rotateInternal( deltaX, deltaY );
				this._isUserControllingRotate = true;

			}

			if (
				( this._state & ACTION.DOLLY ) === ACTION.DOLLY ||
				( this._state & ACTION.ZOOM ) === ACTION.ZOOM
			) {

				const dollyX = this.dollyToCursor ? ( dragStartPosition.x - this._elementRect.x ) / this._elementRect.width  *   2 - 1 : 0;
				const dollyY = this.dollyToCursor ? ( dragStartPosition.y - this._elementRect.y ) / this._elementRect.height * - 2 + 1 : 0;
				const dollyDirection = this.dollyDragInverted ? - 1 : 1;

				if ( ( this._state & ACTION.DOLLY ) === ACTION.DOLLY ) {

					this._dollyInternal( dollyDirection * deltaY * TOUCH_DOLLY_FACTOR, dollyX, dollyY );
					this._isUserControllingDolly = true;

				} else {

					this._zoomInternal( dollyDirection * deltaY * TOUCH_DOLLY_FACTOR, dollyX, dollyY );
					this._isUserControllingZoom = true;

				}

			}

			if (
				( this._state & ACTION.TOUCH_DOLLY ) === ACTION.TOUCH_DOLLY ||
				( this._state & ACTION.TOUCH_ZOOM ) === ACTION.TOUCH_ZOOM ||
				( this._state & ACTION.TOUCH_DOLLY_TRUCK ) === ACTION.TOUCH_DOLLY_TRUCK ||
				( this._state & ACTION.TOUCH_ZOOM_TRUCK ) === ACTION.TOUCH_ZOOM_TRUCK ||
				( this._state & ACTION.TOUCH_DOLLY_OFFSET ) === ACTION.TOUCH_DOLLY_OFFSET ||
				( this._state & ACTION.TOUCH_ZOOM_OFFSET ) === ACTION.TOUCH_ZOOM_OFFSET ||
				( this._state & ACTION.TOUCH_DOLLY_ROTATE ) === ACTION.TOUCH_DOLLY_ROTATE ||
				( this._state & ACTION.TOUCH_ZOOM_ROTATE ) === ACTION.TOUCH_ZOOM_ROTATE
			) {

				const dx = _v2.x - this._activePointers[ 1 ].clientX;
				const dy = _v2.y - this._activePointers[ 1 ].clientY;
				const distance = Math.sqrt( dx * dx + dy * dy );
				const dollyDelta = dollyStart.y - distance;
				dollyStart.set( 0, distance );

				const dollyX = this.dollyToCursor ? ( lastDragPosition.x - this._elementRect.x ) / this._elementRect.width  *   2 - 1 : 0;
				const dollyY = this.dollyToCursor ? ( lastDragPosition.y - this._elementRect.y ) / this._elementRect.height * - 2 + 1 : 0;

				if (
					( this._state & ACTION.TOUCH_DOLLY ) === ACTION.TOUCH_DOLLY ||
					( this._state & ACTION.TOUCH_DOLLY_ROTATE ) === ACTION.TOUCH_DOLLY_ROTATE ||
					( this._state & ACTION.TOUCH_DOLLY_TRUCK ) === ACTION.TOUCH_DOLLY_TRUCK ||
					( this._state & ACTION.TOUCH_DOLLY_OFFSET ) === ACTION.TOUCH_DOLLY_OFFSET
				) {

					this._dollyInternal( dollyDelta * TOUCH_DOLLY_FACTOR, dollyX, dollyY );
					this._isUserControllingDolly = true;

				} else {

					this._zoomInternal( dollyDelta * TOUCH_DOLLY_FACTOR, dollyX, dollyY );
					this._isUserControllingZoom = true;

				}

			}

			if (
				( this._state & ACTION.TRUCK ) === ACTION.TRUCK ||
				( this._state & ACTION.TOUCH_TRUCK ) === ACTION.TOUCH_TRUCK ||
				( this._state & ACTION.TOUCH_DOLLY_TRUCK ) === ACTION.TOUCH_DOLLY_TRUCK ||
				( this._state & ACTION.TOUCH_ZOOM_TRUCK ) === ACTION.TOUCH_ZOOM_TRUCK
			) {

				this._truckInternal( deltaX, deltaY, false );
				this._isUserControllingTruck = true;

			}

			if (
				( this._state & ACTION.OFFSET ) === ACTION.OFFSET ||
				( this._state & ACTION.TOUCH_OFFSET ) === ACTION.TOUCH_OFFSET ||
				( this._state & ACTION.TOUCH_DOLLY_OFFSET ) === ACTION.TOUCH_DOLLY_OFFSET ||
				( this._state & ACTION.TOUCH_ZOOM_OFFSET ) === ACTION.TOUCH_ZOOM_OFFSET
			) {

				this._truckInternal( deltaX, deltaY, true );
				this._isUserControllingOffset = true;

			}

			this.dispatchEvent( { type: 'control' } );

		};

		const endDragging = (): void => {

			extractClientCoordFromEvent( this._activePointers, _v2 );
			lastDragPosition.copyFrom( _v2 );

			this._dragNeedsUpdate = false;

			if (
				this._activePointers.length === 0 ||
				( this._activePointers.length === 1 && this._activePointers[ 0 ] === this._lockedPointer )
			) {

				this._isDragging = false;

			}

			if ( this._activePointers.length === 0 && this._domElement ) {

				// eslint-disable-next-line no-undef
				this._domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, { passive: false } as AddEventListenerOptions );
				this._domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

				this.dispatchEvent( { type: 'controlend' } );

			}

		};

		this.lockPointer = (): void => {

			if ( ! this._enabled || ! this._domElement ) return;

			this.cancel();

			// Element.requestPointerLock is allowed to happen without any pointer active - create a faux one for compatibility with controls
			this._lockedPointer = {
				pointerId: - 1,
				clientX: 0,
				clientY: 0,
				deltaX: 0,
				deltaY: 0,
				mouseButton: null,
			};
			this._activePointers.push( this._lockedPointer );

			// eslint-disable-next-line no-undef
			this._domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, { passive: false } as AddEventListenerOptions );
			this._domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

			this._domElement.requestPointerLock();
			this._domElement.ownerDocument.addEventListener( 'pointerlockchange', onPointerLockChange );
			this._domElement.ownerDocument.addEventListener( 'pointerlockerror', onPointerLockError );

			this._domElement.ownerDocument.addEventListener( 'pointermove', onPointerMove, { passive: false } );
			this._domElement.ownerDocument.addEventListener( 'pointerup', onPointerUp );

			startDragging();

		};

		this.unlockPointer = (): void => {

			if ( this._lockedPointer !== null ) {

				this._disposePointer( this._lockedPointer );
				this._lockedPointer = null;

			}

			this._domElement?.ownerDocument.exitPointerLock();
			this._domElement?.ownerDocument.removeEventListener( 'pointerlockchange', onPointerLockChange );
			this._domElement?.ownerDocument.removeEventListener( 'pointerlockerror', onPointerLockError );

			this.cancel();

		};

		const onPointerLockChange = (): void => {

			const isPointerLockActive = this._domElement && this._domElement.ownerDocument.pointerLockElement === this._domElement;
			if ( ! isPointerLockActive ) this.unlockPointer();

		};

		const onPointerLockError = (): void => {

			this.unlockPointer();

		};

		this._addAllEventListeners = ( domElement: HTMLElement ): void => {

			this._domElement = domElement;

			this._domElement.style.touchAction = 'none';
			this._domElement.style.userSelect = 'none';
			this._domElement.style.webkitUserSelect = 'none';

			this._domElement.addEventListener( 'pointerdown', onPointerDown );
			this._domElement.addEventListener( 'pointercancel', onPointerUp );
			this._domElement.addEventListener( 'wheel', onMouseWheel, { passive: false } );
			this._domElement.addEventListener( 'contextmenu', onContextMenu );

		};

		this._removeAllEventListeners = (): void => {

			if ( ! this._domElement ) return;

			this._domElement.style.touchAction = '';
			this._domElement.style.userSelect = '';
			this._domElement.style.webkitUserSelect = '';

			this._domElement.removeEventListener( 'pointerdown', onPointerDown );
			this._domElement.removeEventListener( 'pointercancel', onPointerUp );
			// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#matching_event_listeners_for_removal
			// > it's probably wise to use the same values used for the call to `addEventListener()` when calling `removeEventListener()`
			// see https://github.com/microsoft/TypeScript/issues/32912#issuecomment-522142969
			// eslint-disable-next-line no-undef
			this._domElement.removeEventListener( 'wheel', onMouseWheel, { passive: false } as AddEventListenerOptions );
			this._domElement.removeEventListener( 'contextmenu', onContextMenu );
			// eslint-disable-next-line no-undef
			this._domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, { passive: false } as AddEventListenerOptions );
			this._domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp );

			this._domElement.ownerDocument.removeEventListener( 'pointerlockchange', onPointerLockChange );
			this._domElement.ownerDocument.removeEventListener( 'pointerlockerror', onPointerLockError );

		};

		this.cancel = (): void => {

			if ( this._state === ACTION.NONE ) return;

			this._state = ACTION.NONE;
			this._activePointers.length = 0;
			endDragging();

		};

		if ( domElement ) this.connect( domElement );
		this.update( 0 );

	}

	/**
	 * The camera to be controlled
	 * @category Properties
	 */
	get camera(): Camera {
		return this._camera;
	}

	set camera( camera: Camera) {
		this._camera = camera;
		this.updateCameraUp();
		// TODO In galacean maybe wo don't need to update the projectionMatrix manually
		// this.camera.entity.transform.worldUpdateProjectionMatrix();
		this._updateNearPlaneCorners();
		this._needsUpdate = true;
	}

	/**
	 * Whether or not the controls are enabled.  
	 * `false` to disable user dragging/touch-move, but all methods works.
	 * @category Properties
	 */
	get enabled(): boolean {

		return this._enabled;

	}

	set enabled( enabled: boolean ) {

		this._enabled = enabled;

		if ( ! this._domElement ) return;
		if ( enabled ) {

			this._domElement.style.touchAction = 'none';
			this._domElement.style.userSelect = 'none';
			this._domElement.style.webkitUserSelect = 'none';

		} else {

			this.cancel();
			this._domElement.style.touchAction = '';
			this._domElement.style.userSelect = '';
			this._domElement.style.webkitUserSelect = '';

		}

	}

	/**
	 * Returns `true` if the controls are active updating.  
	 * readonly value.
	 * @category Properties
	 */
	get active(): boolean {

		return ! this._hasRested;

	}

	/**
	 * Getter for the current `ACTION`.  
	 * readonly value.
	 * @category Properties
	 */
	get currentAction(): ACTION {

		return this._state;

	}

	/**
	 * get/set Current distance.
	 * @category Properties
	 */
	get distance(): number {

		return this._spherical.radius;

	}

	set distance( distance: number ) {

		if (
			this._spherical.radius === distance &&
			this._sphericalEnd.radius === distance
		) return;

		this._spherical.radius = distance;
		this._sphericalEnd.radius = distance;
		this._needsUpdate = true;

	}

	// horizontal angle
	/**
	 * get/set the azimuth angle (horizontal) in radians.  
	 * Every 360 degrees turn is added to `.azimuthAngle` value, which is accumulative.
	 * @category Properties
	 */
	get azimuthAngle(): number {

		return this._spherical.theta;

	}

	set azimuthAngle( azimuthAngle: number ) {

		if (
			this._spherical.theta === azimuthAngle &&
			this._sphericalEnd.theta === azimuthAngle
		) return;

		this._spherical.theta = azimuthAngle;
		this._sphericalEnd.theta = azimuthAngle;
		this._needsUpdate = true;

	}

	// vertical angle
	/**
	 * get/set the polar angle (vertical) in radians.
	 * @category Properties
	 */
	get polarAngle(): number {

		return this._spherical.phi;

	}

	set polarAngle( polarAngle: number ) {

		if (
			this._spherical.phi === polarAngle &&
			this._sphericalEnd.phi === polarAngle
		) return;

		this._spherical.phi = polarAngle;
		this._sphericalEnd.phi = polarAngle;
		this._needsUpdate = true;

	}

	/**
	 * Whether camera position should be enclosed in the boundary or not.
	 * @category Properties
	 */
	get boundaryEnclosesCamera(): boolean {

		return this._boundaryEnclosesCamera;

	}

	set boundaryEnclosesCamera( boundaryEnclosesCamera: boolean ) {

		this._boundaryEnclosesCamera = boundaryEnclosesCamera;
		this._needsUpdate = true;

	}

	/**
	 * Set drag-start, touches and wheel enable area in the domElement.  
	 * each values are between `0` and `1` inclusive, where `0` is left/top and `1` is right/bottom of the screen.  
	 * e.g. `{ x: 0, y: 0, width: 1, height: 1 }` for entire area.
	 * @category Properties
	 */
	set interactiveArea( interactiveArea: DOMRect | { x: number, y: number, width: number, height: number } ) {

		this._interactiveArea.width = clamp( interactiveArea.width, 0, 1 );
		this._interactiveArea.height = clamp( interactiveArea.height, 0, 1 );
		this._interactiveArea.x = clamp( interactiveArea.x, 0, 1 - this._interactiveArea.width );
		this._interactiveArea.y = clamp( interactiveArea.y, 0, 1 - this._interactiveArea.height );

	}

	/**
	 * Adds the specified event listener.
	 * Applicable event types (which is `K`) are:
	 * | Event name          | Timing |
	 * | ------------------- | ------ |
	 * | `'controlstart'`    | When the user starts to control the camera via mouse / touches. ¹ |
	 * | `'control'`         | When the user controls the camera (dragging). |
	 * | `'controlend'`      | When the user ends to control the camera. ¹ |
	 * | `'transitionstart'` | When any kind of transition starts, either user control or using a method with `enableTransition = true` |
	 * | `'update'`          | When the camera position is updated. |
	 * | `'wake'`            | When the camera starts moving. |
	 * | `'rest'`            | When the camera movement is below `.restThreshold` ². |
	 * | `'sleep'`           | When the camera end moving. |
	 *
	 * 1. `mouseButtons.wheel` (Mouse wheel control) does not emit `'controlstart'` and `'controlend'`. `mouseButtons.wheel` uses scroll-event internally, and scroll-event happens intermittently. That means "start" and "end" cannot be detected.
	 * 2. Due to damping, `sleep` will usually fire a few seconds after the camera _appears_ to have stopped moving. If you want to do something (e.g. enable UI, perform another transition) at the point when the camera has stopped, you probably want the `rest` event. This can be fine tuned using the `.restThreshold` parameter. See the [Rest and Sleep Example](https://yomotsu.github.io/camera-controls/examples/rest-and-sleep.html).
	 *
	 * e.g.
	 * ```
	 * cameraControl.addEventListener( 'controlstart', myCallbackFunction );
	 * ```
	 * @param type event name
	 * @param listener handler function
	 * @category Methods
	 */
	addEventListener<K extends keyof CameraControlsEventMap>(
		type: K,
		listener: ( event: CameraControlsEventMap[ K ] ) => any,
	): void {

		super.addEventListener( type, listener as Listener );

	}

	/**
	 * Removes the specified event listener
	 * e.g.
	 * ```
	 * cameraControl.addEventListener( 'controlstart', myCallbackFunction );
	 * ```
	 * @param type event name
	 * @param listener handler function
	 * @category Methods
	 */
	removeEventListener<K extends keyof CameraControlsEventMap>(
		type: K,
		listener: ( event: CameraControlsEventMap[ K ] ) => any,
	): void {

		super.removeEventListener( type, listener as Listener );

	}

	/**
	 * Rotate azimuthal angle(horizontal) and polar angle(vertical).
	 * Every value is added to the current value.
	 * @param azimuthAngle Azimuth rotate angle. In radian.
	 * @param polarAngle Polar rotate angle. In radian.
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	rotate( azimuthAngle: number, polarAngle: number, enableTransition: boolean = false ): Promise<void> {

		return this.rotateTo(
			this._sphericalEnd.theta + azimuthAngle,
			this._sphericalEnd.phi   + polarAngle,
			enableTransition,
		);

	}

	/**
	 * Rotate azimuthal angle(horizontal) to the given angle and keep the same polar angle(vertical) target.
	 *
	 * e.g.
	 * ```
	 * cameraControls.rotateAzimuthTo( 30 * THREE.MathUtils.DEG2RAD, true );
	 * ```
	 * @param azimuthAngle Azimuth rotate angle. In radian.
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	rotateAzimuthTo( azimuthAngle: number, enableTransition: boolean = false ): Promise<void> {

		return this.rotateTo(
			azimuthAngle,
			this._sphericalEnd.phi,
			enableTransition,
		);

	}

	/**
	 * Rotate polar angle(vertical) to the given angle and keep the same azimuthal angle(horizontal) target.
	 *
	 * e.g.
	 * ```
	 * cameraControls.rotatePolarTo( 30 * THREE.MathUtils.DEG2RAD, true );
	 * ```
	 * @param polarAngle Polar rotate angle. In radian.
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	rotatePolarTo( polarAngle: number, enableTransition: boolean = false ): Promise<void> {

		return this.rotateTo(
			this._sphericalEnd.theta,
			polarAngle,
			enableTransition,
		);

	}

	/**
	 * Rotate azimuthal angle(horizontal) and polar angle(vertical) to the given angle.  
	 * Camera view will rotate over the orbit pivot absolutely:
	 *
	 * azimuthAngle
	 * ```
	 *       0º
	 *         \
	 * 90º -----+----- -90º
	 *           \
	 *           180º
	 * ```
	 * | direction | angle                  |
	 * | --------- | ---------------------- |
	 * | front     | 0º                     |
	 * | left      | 90º (`Math.PI / 2`)    |
	 * | right     | -90º (`- Math.PI / 2`) |
	 * | back      | 180º (`Math.PI`)       |
	 *
	 * polarAngle
	 * ```
	 *     180º
	 *      |
	 *      90º
	 *      |
	 *      0º
	 * ```
	 * | direction            | angle                  |
	 * | -------------------- | ---------------------- |
	 * | top/sky              | 180º (`Math.PI`)       |
	 * | horizontal from view | 90º (`Math.PI / 2`)    |
	 * | bottom/floor         | 0º                     |
	 *
	 * @param azimuthAngle Azimuth rotate angle to. In radian.
	 * @param polarAngle Polar rotate angle to. In radian.
	 * @param enableTransition  Whether to move smoothly or immediately
	 * @category Methods
	 */
	rotateTo( azimuthAngle: number, polarAngle: number, enableTransition: boolean = false ): Promise<void> {

		this._isUserControllingRotate = false;

		const theta = clamp( azimuthAngle, this.minAzimuthAngle, this.maxAzimuthAngle );
		const phi   = clamp( polarAngle,   this.minPolarAngle,   this.maxPolarAngle );

		this._sphericalEnd.theta = theta;
		this._sphericalEnd.phi   = phi;
		this._sphericalEnd.makeSafe();

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._spherical.theta = this._sphericalEnd.theta;
			this._spherical.phi   = this._sphericalEnd.phi;

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._spherical.theta, this._sphericalEnd.theta, this.restThreshold ) &&
			approxEquals( this._spherical.phi, this._sphericalEnd.phi, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Dolly in/out camera position.
	 * @param distance Distance of dollyIn. Negative number for dollyOut.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @category Methods
	 */
	dolly( distance: number, enableTransition: boolean = false ): Promise<void> {

		return this.dollyTo( this._sphericalEnd.radius - distance, enableTransition );

	}

	/**
	 * Dolly in/out camera position to given distance.
	 * @param distance Distance of dolly.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @category Methods
	 */
	dollyTo( distance: number, enableTransition: boolean = false ): Promise<void> {

		this._isUserControllingDolly = false;
		this._lastDollyDirection = DOLLY_DIRECTION.NONE;
		this._changedDolly = 0;
		return this._dollyToNoClamp( clamp( distance, this.minDistance, this.maxDistance ), enableTransition );

	}

	protected _dollyToNoClamp( distance: number, enableTransition: boolean = false ): Promise<void> {

		const lastRadius = this._sphericalEnd.radius;
		const hasCollider = this.colliderMeshes.length >= 1;

		if ( hasCollider ) {

			const maxDistanceByCollisionTest = this._collisionTest();
			const isCollided = approxEquals( maxDistanceByCollisionTest, this._spherical.radius );
			const isDollyIn = lastRadius > distance;

			if ( ! isDollyIn && isCollided ) return Promise.resolve();

			this._sphericalEnd.radius = Math.min( distance, maxDistanceByCollisionTest );

		} else {

			this._sphericalEnd.radius = distance;

		}

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._spherical.radius = this._sphericalEnd.radius;

		}

		const resolveImmediately =  ! enableTransition || approxEquals( this._spherical.radius, this._sphericalEnd.radius, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Dolly in, but does not change the distance between the target and the camera, and moves the target position instead.
	 * Specify a negative value for dolly out.
	 * @param distance Distance of dolly.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @category Methods
	 */
	dollyInFixed( distance: number, enableTransition: boolean = false ): Promise<void> {

		// this._targetEnd.add( this._getCameraDirection( _cameraDirection ).scale( distance ) );
		this._targetEnd.add( this._getCameraDirection( _cameraDirection ).scale( distance ) );

		if ( ! enableTransition ) {

			this._target.copyFrom( this._targetEnd );

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._target.x, this._targetEnd.x, this.restThreshold ) &&
			approxEquals( this._target.y, this._targetEnd.y, this.restThreshold ) &&
			approxEquals( this._target.z, this._targetEnd.z, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Zoom in/out camera. The value is added to camera zoom.
	 * Limits set with `.minZoom` and `.maxZoom`
	 * @param zoomStep zoom scale
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	zoom( zoomStep: number, enableTransition: boolean = false ): Promise<void> {

		return this.zoomTo( this._zoomEnd + zoomStep, enableTransition );

	}

	/**
	 * Zoom in/out camera to given scale. The value overwrites camera zoom.
	 * Limits set with .minZoom and .maxZoom
	 * @param zoom
	 * @param enableTransition
	 * @category Methods
	 */
	zoomTo( zoom: number, enableTransition: boolean = false ): Promise<void> {

		this._isUserControllingZoom = false;

		this._zoomEnd = clamp( zoom, this.minZoom, this.maxZoom );
		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._zoom = this._zoomEnd;

		}

		const resolveImmediately = ! enableTransition || approxEquals( this._zoom, this._zoomEnd, this.restThreshold );
		this._changedZoom = 0;
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * @deprecated `pan()` has been renamed to `truck()`
	 * @category Methods
	 */
	pan( x: number, y: number, enableTransition: boolean = false ): Promise<void> {

		console.warn( '`pan` has been renamed to `truck`' );
		return this.truck( x, y, enableTransition );

	}

	/**
	 * Truck and pedestal camera using current azimuthal angle
	 * @param x Horizontal translate amount
	 * @param y Vertical translate amount
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	truck( x: number, y: number, enableTransition: boolean = false ): Promise<void> {

		// TODO 
		// this.camera.entity.transform.worldUpdateMatrix();

		const cameraMatrix = this._camera.viewMatrix.elements;

		// _xColumn.setFromMatrixColumn( this._camera.viewMatrix, 0 );
		// _yColumn.setFromMatrixColumn( this._camera.viewMatrix, 1 );
		_xColumn.set( cameraMatrix[ 0 ], cameraMatrix[ 1 ], cameraMatrix[ 2 ] );
		_yColumn.set( cameraMatrix[ 4 ], cameraMatrix[ 5 ], cameraMatrix[ 6 ] );

		_xColumn.scale(   x );
		_yColumn.scale( - y );

		const offset = _v3A.copyFrom( _xColumn ).add( _yColumn );
		const to = _v3B.copyFrom( this._targetEnd ).add( offset );
		return this.moveTo( to.x, to.y, to.z, enableTransition );
	}

	/**
	 * Move forward / backward.
	 * @param distance Amount to move forward / backward. Negative value to move backward
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	forward( distance: number, enableTransition: boolean = false ): Promise<void> {
		const cameraMatrix = this._camera.viewMatrix.elements;

		_v3A.set( cameraMatrix[0], cameraMatrix[1], cameraMatrix[2] );

		// _v3A.setFromMatrixColumn( this._camera.matrix, 0 );
		Vector3.cross( this.camera.entity.transform.worldUp, _v3A, _v3A );
		_v3A.scale( distance );

		const to = _v3B.copyFrom( this._targetEnd ).add( _v3A );
		return this.moveTo( to.x, to.y, to.z, enableTransition );

	}

	/**
	 * Move up / down.
	 * @param height Amount to move up / down. Negative value to move down
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	elevate( height: number, enableTransition: boolean = false ): Promise<void> {

		_v3A.copyFrom( this.camera.entity.transform.worldUp ).scale( height );
		return this.moveTo(
			this._targetEnd.x + _v3A.x,
			this._targetEnd.y + _v3A.y,
			this._targetEnd.z + _v3A.z,
			enableTransition,
		);

	}

	/**
	 * Move target position to given point.
	 * @param x x coord to move center position
	 * @param y y coord to move center position
	 * @param z z coord to move center position
	 * @param enableTransition Whether to move smoothly or immediately
	 * @category Methods
	 */
	moveTo( x: number, y: number, z: number, enableTransition: boolean = false ): Promise<void> {

		this._isUserControllingTruck = false;

		const offset = _v3A.set( x, y, z ).subtract( this._targetEnd );
		this._encloseToBoundary( this._targetEnd, offset, this.boundaryFriction );

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._target.copyFrom( this._targetEnd );

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._target.x, this._targetEnd.x, this.restThreshold ) &&
			approxEquals( this._target.y, this._targetEnd.y, this.restThreshold ) &&
			approxEquals( this._target.z, this._targetEnd.z, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Look in the given point direction.
	 * @param x point x.
	 * @param y point y.
	 * @param z point z.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @returns Transition end promise
	 * @category Methods
	 */
	lookInDirectionOf( x: number, y: number, z: number, enableTransition: boolean = false ): Promise<void> {

		const point = _v3A.subtract(new Vector3( x, y, z ));
		const direction = point.subtract( this._targetEnd ).normalize();
		const position = direction.scale( - this._sphericalEnd.radius ).add( this._targetEnd );
		return this.setPosition( position.x, position.y, position.z, enableTransition );

	}

	/**
	 * Fit the viewport to the box or the bounding box of the object, using the nearest axis. paddings are in unit.
	 * set `cover: true` to fill enter screen.
	 * e.g.
	 * ```
	 * cameraControls.fitToBox( myMesh );
	 * ```
	 * @param box3OrObject Axis aligned bounding box to fit the view.
	 * @param enableTransition Whether to move smoothly or immediately.
	 * @param options | `<object>` { cover: boolean, paddingTop: number, paddingLeft: number, paddingBottom: number, paddingRight: number }
	 * @returns Transition end promise
	 * @category Methods
	 */
	fitToBox( box3OrObject: BoundingBox | _GALACEAN.Entity, enableTransition: boolean, {
		cover = false,
		paddingLeft = 0,
		paddingRight = 0,
		paddingBottom = 0,
		paddingTop = 0
	}: Partial<FitToOptions> = {} ): Promise<void[]> {

		const promises: Promise<void>[] = [];
		let aabb: BoundingBox = _box3A;

		if( box3OrObject instanceof BoundingBox ) {
			aabb = _box3A.copyFrom( box3OrObject );
		} else if(box3OrObject instanceof Entity) {
			const _boundingBox = new BoundingBox();
			const meshes = box3OrObject.getComponentsIncludeChildren( MeshRenderer , []);
			// Merge the bounding boxes of the rest of the renderers.
			for (let i = 0; i < meshes.length; i++) {
				BoundingBox.merge(_boundingBox, meshes[i].bounds, _boundingBox);
			}
			aabb = _box3A.copyFrom( _boundingBox );
		}

		function isBoundingBoxEmpty(box: BoundingBox = aabb): boolean {
			return box.min.x > box.max.x || box.min.y > box.max.y || box.min.z > box.max.z;
		}

		if ( isBoundingBoxEmpty() )  {

			console.warn( 'camera-controls: fitTo() cannot be used with an empty box. Aborting' );
			Promise.resolve();

		}

		// round to closest axis ( forward | backward | right | left | top | bottom )
		const theta = roundToStep( this._sphericalEnd.theta, PI_HALF );
		const phi   = roundToStep( this._sphericalEnd.phi,   PI_HALF );

		promises.push( this.rotateTo( theta, phi, enableTransition ) );

		const { radius: _radius, phi: _phi, theta: _theta } = this._sphericalEnd;
		_v3A.x = _radius * Math.sin( _phi ) * Math.cos( _theta );
		_v3A.y = _radius * Math.cos( _phi );
		_v3A.z = _radius * Math.sin( _phi ) * Math.sin( _theta );

		const normal = _v3A.normalize();

		const rotation = setFromUnitVectors(_quaternionA, normal, _AXIS_Z);
		const viewFromPolar = approxEquals( Math.abs( normal.y ), 1 );
		if ( viewFromPolar ) {

			Quaternion.rotationAxisAngle(_AXIS_Y, PI_HALF, _quaternionB);

			rotation.multiply( _quaternionB );

		}

		rotation.multiply( this._yAxisUpSpaceInverse );

		// make oriented bounding box
		// const bb = _box3B.makeEmpty();
		_box3B.min.set( - Infinity, - Infinity, - Infinity );
		_box3B.max.set(   Infinity,   Infinity,   Infinity );
		const bb = _box3B


		// left bottom back corner
		_v3B.copyFrom( aabb.min );
		Vector3.transformByQuat( _v3B, rotation, _v3B );

		bb.expandByPoint( _v3B );

		// right bottom back corner
		_v3B.copyFrom( aabb.min ).x = ( aabb.max.x )
		Vector3.transformByQuat( _v3B, rotation, _v3B );
		bb.expandByPoint( _v3B );

		// left top back corner
		_v3B.copyFrom( aabb.min ).y = ( aabb.max.y )
		Vector3.transformByQuat( _v3B, rotation, _v3B );
		bb.expandByPoint( _v3B );

		// right top back corner
		_v3B.copyFrom( aabb.max ).z = ( aabb.min.z )
		Vector3.transformByQuat( _v3B, rotation, _v3B );
		bb.expandByPoint( _v3B );

		// left bottom front corner
		_v3B.copyFrom( aabb.min ).z = ( aabb.max.z )
		Vector3.transformByQuat( _v3B, rotation, _v3B );
		bb.expandByPoint( _v3B );

		// right bottom front corner
		_v3B.copyFrom( aabb.max ).y = ( aabb.min.y )
		Vector3.transformByQuat( _v3B, rotation, _v3B );
		bb.expandByPoint( _v3B );

		// left top front corner
		_v3B.copyFrom( aabb.max ).x = ( aabb.min.x )
		Vector3.transformByQuat( _v3B, rotation, _v3B );
		bb.expandByPoint( _v3B );

		// right top front corner
		_v3B.copyFrom( aabb.max )
		Vector3.transformByQuat( _v3B, rotation, _v3B );
		bb.expandByPoint( _v3B );

		// add padding
		bb.min.x -= paddingLeft;
		bb.min.y -= paddingBottom;
		bb.max.x += paddingRight;
		bb.max.y += paddingTop;

		rotation.setFromUnitVectors( _AXIS_Z, normal );

		if ( viewFromPolar ) {

			rotation.premultiply( _quaternionB.invert() );

		}

		rotation.premultiply( this._yAxisUpSpace );

		const bbSize = bb.getSize( _v3A );
		const center = bb.getCenter( _v3B ).applyQuaternion( rotation );

		if ( isPerspectiveCamera( this._camera ) ) {

			const distance = this.getDistanceToFitBox( bbSize.x, bbSize.y, bbSize.z, cover );
			promises.push( this.moveTo( center.x, center.y, center.z, enableTransition ) );
			promises.push( this.dollyTo( distance, enableTransition ) );
			promises.push( this.setFocalOffset( 0, 0, 0, enableTransition ) );

		} else if ( isOrthographicCamera( this._camera ) ) {
			const width = (this._camera as any)._frustum.right - (this._camera as any)._frustum.left;
			const height = (this._camera as any)._frustum.top - (this._camera as any)._frustum.bottom;
			const zoom = cover ? Math.max( width / bbSize.x, height / bbSize.y ) : Math.min( width / bbSize.x, height / bbSize.y );
			promises.push( this.moveTo( center.x, center.y, center.z, enableTransition ) );
			promises.push( this.zoomTo( zoom, enableTransition ) );
			promises.push( this.setFocalOffset( 0, 0, 0, enableTransition ) );

		}

		return Promise.all( promises );

	}

	/**
	 * Fit the viewport to the sphere or the bounding sphere of the object.
	 * @param sphereOrMesh
	 * @param enableTransition
	 * @category Methods
	 */
	fitToSphere( sphereOrMesh: Entity, enableTransition: boolean ): Promise<void[]> {

		const promises: Promise<void>[] = [];
		const boundingSphere = CameraControls.createBoundingSphere( sphereOrMesh, _sphere )

		promises.push( this.moveTo(
			boundingSphere.center.x,
			boundingSphere.center.y,
			boundingSphere.center.z,
			enableTransition,
		) );

		if ( isPerspectiveCamera( this._camera ) ) {

			const distanceToFit = this.getDistanceToFitSphere( boundingSphere.radius );
			promises.push( this.dollyTo( distanceToFit, enableTransition ) );

		} else if ( isOrthographicCamera( this._camera ) ) {
			const width = (this._camera as any)._frustum.right - (this._camera as any)._frustum.left;
			const height = (this._camera as any)._frustum.top - (this._camera as any)._frustum.bottom;
			const diameter = 2 * boundingSphere.radius;
			const zoom = Math.min( width / diameter, height / diameter );
			promises.push( this.zoomTo( zoom, enableTransition ) );

		}

		promises.push( this.setFocalOffset( 0, 0, 0, enableTransition ) );

		return Promise.all( promises );

	}

	/**
	 * Look at the `target` from the `position`.
	 * @param positionX
	 * @param positionY
	 * @param positionZ
	 * @param targetX
	 * @param targetY
	 * @param targetZ
	 * @param enableTransition
	 * @category Methods
	 */
	setLookAt(
		positionX: number, positionY: number, positionZ: number,
		targetX: number, targetY: number, targetZ: number,
		enableTransition: boolean = false,
	): Promise<void> {

		this._isUserControllingRotate = false;
		this._isUserControllingDolly = false;
		this._isUserControllingTruck = false;
		this._lastDollyDirection = DOLLY_DIRECTION.NONE;
		this._changedDolly = 0;

		const target = _v3B.set( targetX, targetY, targetZ );
		const position = _v3A.set( positionX, positionY, positionZ );

		this._targetEnd.copyFrom( target );
		this._sphericalEnd.setFromVector3( position.subtract( target ).applyQuaternion( this._yAxisUpSpace ) );
		this.normalizeRotations();

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._target.copyFrom( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._target.x, this._targetEnd.x, this.restThreshold ) &&
			approxEquals( this._target.y, this._targetEnd.y, this.restThreshold ) &&
			approxEquals( this._target.z, this._targetEnd.z, this.restThreshold ) &&
			approxEquals( this._spherical.theta, this._sphericalEnd.theta, this.restThreshold ) &&
			approxEquals( this._spherical.phi, this._sphericalEnd.phi, this.restThreshold ) &&
			approxEquals( this._spherical.radius, this._sphericalEnd.radius, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Similar to setLookAt, but it interpolates between two states.
	 * @param positionAX
	 * @param positionAY
	 * @param positionAZ
	 * @param targetAX
	 * @param targetAY
	 * @param targetAZ
	 * @param positionBX
	 * @param positionBY
	 * @param positionBZ
	 * @param targetBX
	 * @param targetBY
	 * @param targetBZ
	 * @param t
	 * @param enableTransition
	 * @category Methods
	 */
	lerpLookAt(
		positionAX: number, positionAY: number, positionAZ: number,
		targetAX: number, targetAY: number, targetAZ: number,
		positionBX: number, positionBY: number, positionBZ: number,
		targetBX: number, targetBY: number, targetBZ: number,
		t: number,
		enableTransition: boolean = false,
	): Promise<void> {

		this._isUserControllingRotate = false;
		this._isUserControllingDolly = false;
		this._isUserControllingTruck = false;
		this._lastDollyDirection = DOLLY_DIRECTION.NONE;
		this._changedDolly = 0;

		const targetA = _v3A.set( targetAX, targetAY, targetAZ );
		const positionA = _v3B.set( positionAX, positionAY, positionAZ );
		_sphericalA.setFromVector3( positionA.subtract( targetA ).transformByQuat( this._yAxisUpSpace ));

		const targetB = _v3C.set( targetBX, targetBY, targetBZ );
		const positionB = _v3B.set( positionBX, positionBY, positionBZ );
		_sphericalB.setFromVector3( positionB.subtract( targetB ).transformByQuat( this._yAxisUpSpace ) );

		Vector3.lerp(targetA, targetB, t, targetA)

		this._targetEnd.copyFrom(targetA); // tricky

		const deltaTheta  = _sphericalB.theta  - _sphericalA.theta;
		const deltaPhi    = _sphericalB.phi    - _sphericalA.phi;
		const deltaRadius = _sphericalB.radius - _sphericalA.radius;

		this._sphericalEnd.set(
			_sphericalA.radius + deltaRadius * t,
			_sphericalA.phi    + deltaPhi    * t,
			_sphericalA.theta  + deltaTheta  * t,
		);

		this.normalizeRotations();

		this._needsUpdate = true;

		if ( ! enableTransition ) {

			this._target.copyFrom( this._targetEnd );
			this._spherical.copy( this._sphericalEnd );

		}

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._target.x, this._targetEnd.x, this.restThreshold ) &&
			approxEquals( this._target.y, this._targetEnd.y, this.restThreshold ) &&
			approxEquals( this._target.z, this._targetEnd.z, this.restThreshold ) &&
			approxEquals( this._spherical.theta, this._sphericalEnd.theta, this.restThreshold ) &&
			approxEquals( this._spherical.phi, this._sphericalEnd.phi, this.restThreshold ) &&
			approxEquals( this._spherical.radius, this._sphericalEnd.radius, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Set angle and distance by given position.
	 * An alias of `setLookAt()`, without target change. Thus keep gazing at the current target
	 * @param positionX
	 * @param positionY
	 * @param positionZ
	 * @param enableTransition
	 * @category Methods
	 */
	setPosition( positionX: number, positionY: number, positionZ: number, enableTransition: boolean = false ): Promise<void> {

		return this.setLookAt(
			positionX, positionY, positionZ,
			this._targetEnd.x, this._targetEnd.y, this._targetEnd.z,
			enableTransition,
		);

	}

	/**
	 * Set the target position where gaze at.
	 * An alias of `setLookAt()`, without position change. Thus keep the same position.
	 * @param targetX
	 * @param targetY
	 * @param targetZ
	 * @param enableTransition
	 * @category Methods
	 */
	setTarget( targetX: number, targetY: number, targetZ: number, enableTransition: boolean = false ): Promise<void> {

		const pos = this.getPosition( _v3A );

		const promise = this.setLookAt(
			pos.x, pos.y, pos.z,
			targetX, targetY, targetZ,
			enableTransition,
		);

		// see https://github.com/yomotsu/camera-controls/issues/335
		this._sphericalEnd.phi = clamp( this._sphericalEnd.phi, this.minPolarAngle, this.maxPolarAngle );

		return promise;

	}

	/**
	 * Set focal offset using the screen parallel coordinates. z doesn't affect in Orthographic as with Dolly.
	 * @param x
	 * @param y
	 * @param z
	 * @param enableTransition
	 * @category Methods
	 */
	setFocalOffset( x: number, y: number, z: number, enableTransition: boolean = false ): Promise<void> {

		this._isUserControllingOffset = false;

		this._focalOffsetEnd.set( x, y, z );
		this._needsUpdate = true;

		if ( ! enableTransition ) this._focalOffset.copyFrom( this._focalOffsetEnd );

		const resolveImmediately = ! enableTransition ||
			approxEquals( this._focalOffset.x, this._focalOffsetEnd.x, this.restThreshold ) &&
			approxEquals( this._focalOffset.y, this._focalOffsetEnd.y, this.restThreshold ) &&
			approxEquals( this._focalOffset.z, this._focalOffsetEnd.z, this.restThreshold );
		return this._createOnRestPromise( resolveImmediately );

	}

	/**
	 * Set orbit point without moving the camera.
	 * SHOULD NOT RUN DURING ANIMATIONS. `setOrbitPoint()` will immediately fix the positions.
	 * @param targetX
	 * @param targetY
	 * @param targetZ
	 * @category Methods
	 */
	setOrbitPoint( targetX: number, targetY: number, targetZ : number ) {

		_xColumn.setFromMatrixColumn( (this._camera as any)._getInvViewProjMat, 0 );
		_yColumn.setFromMatrixColumn( (this._camera as any)._getInvViewProjMat, 1 );
		_zColumn.setFromMatrixColumn( (this._camera as any)._getInvViewProjMat, 2 );

		const position = _v3A.set( targetX, targetY, targetZ );


		const distance = Vector3.distance(position, this._camera.entity.transform.position)
		// const distance = position.distanceTo( this._camera.position );
		const cameraToPoint = position.subtract( this._camera.entity.transform.position ).normalize();
		_xColumn.scale( cameraToPoint.x );
		_yColumn.scale( cameraToPoint.y );
		_zColumn.scale( cameraToPoint.z );

		_v3A.copyFrom( _xColumn ).add( _yColumn ).add( _zColumn );
		_v3A.z = _v3A.z + distance;

		this.dollyTo( distance, false );
		this.setFocalOffset( - _v3A.x, _v3A.y, - _v3A.z, false );
		this.moveTo( targetX, targetY, targetZ, false );

	}

	/**
	 * Set the boundary box that encloses the target of the camera. box3 is in THREE.Box3
	 * @param box3
	 * @category Methods
	 */
	setBoundary( box3?: BoundingBox ): void {

		if ( ! box3 ) {

			this._boundary.min.set( - Infinity, - Infinity, - Infinity );
			this._boundary.max.set(   Infinity,   Infinity,   Infinity );
			this._needsUpdate = true;

			return;

		}

		this._boundary.copyFrom( box3 );
		this._boundary.clampPoint( this._targetEnd, this._targetEnd );
		this._needsUpdate = true;

	}

	/**
	 * Set (or unset) the current viewport.
	 * Set this when you want to use renderer viewport and .dollyToCursor feature at the same time.
	 * @param viewportOrX
	 * @param y
	 * @param width
	 * @param height
	 * @category Methods
	 */
	setViewport( viewportOrX: Vector4 | number | null, y: number, width: number, height: number ): void {

		if ( viewportOrX === null ) { // null

			this._viewport = null;

			return;

		}

		this._viewport = this._viewport || new Vector4;

		if ( typeof viewportOrX === 'number' ) { // number

			this._viewport.set( viewportOrX, y, width, height );

		} else { // Vector4

			this._viewport.copyFrom( viewportOrX );

		}

	}

	/**
	 * Calculate the distance to fit the box.
	 * @param width box width
	 * @param height box height
	 * @param depth box depth
	 * @returns distance
	 * @category Methods
	 */
	getDistanceToFitBox( width: number, height: number, depth: number, cover: boolean = false ): number {

		if ( notSupportedInOrthographicCamera( this._camera, 'getDistanceToFitBox' ) ) return this._spherical.radius;

		const boundingRectAspect = width / height;
		const fov = this._camera.fieldOfView * DEG2RAD;
		const aspect = this._camera.aspectRatio;

		const heightToFit = ( cover ? boundingRectAspect > aspect : boundingRectAspect < aspect ) ? height : width / aspect;
		return heightToFit * 0.5 / Math.tan( fov * 0.5 ) + depth * 0.5;

	}

	/**
	 * Calculate the distance to fit the sphere.
	 * @param radius sphere radius
	 * @returns distance
	 * @category Methods
	 */
	getDistanceToFitSphere( radius: number ): number {

		if ( notSupportedInOrthographicCamera( this._camera, 'getDistanceToFitSphere' ) ) return this._spherical.radius;

		// https://stackoverflow.com/a/44849975
		const vFOV = this._camera.fieldOfView * DEG2RAD;
		const hFOV = Math.atan( Math.tan( vFOV * 0.5 ) * this._camera.aspectRatio ) * 2;
		const fov = 1 < this._camera.aspectRatio ? vFOV : hFOV;
		return radius / ( Math.sin( fov * 0.5 ) );

	}

	/**
	 * Returns the orbit center position, where the camera looking at.
	 * @param out The receiving Vector3 instance to copy the result
	 * @param receiveEndValue Whether receive the transition end coords or current. default is `true`
	 * @category Methods
	 */
	getTarget( out: Vector3, receiveEndValue: boolean = true ): Vector3 {

		const _out = out instanceof Vector3 ? out : new Vector3();
		return _out.copyFrom( receiveEndValue ? this._targetEnd : this._target );

	}

	/**
	 * Returns the camera position.
	 * @param out The receiving Vector3 instance to copy the result
	 * @param receiveEndValue Whether receive the transition end coords or current. default is `true`
	 * @category Methods
	 */
	getPosition( out: Vector3, receiveEndValue: boolean = true ): Vector3 {

		const _out = out instanceof Vector3 ? out : new Vector3();
		return _out.setFromSpherical( receiveEndValue ? this._sphericalEnd : this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ).add( receiveEndValue ? this._targetEnd : this._target );

	}

	/**
	 * Returns the spherical coordinates of the orbit.
	 * @param out The receiving Spherical instance to copy the result
	 * @param receiveEndValue Whether receive the transition end coords or current. default is `true`
	 * @category Methods
	 */
	getSpherical( out: _THREE.Spherical, receiveEndValue: boolean = true ): _THREE.Spherical {

		const _out = out instanceof Spherical ? out : new Spherical();
		return _out.copy( receiveEndValue ? this._sphericalEnd : this._spherical );

	}

	/**
	 * Returns the focal offset, which is how much the camera appears to be translated in screen parallel coordinates.
	 * @param out The receiving Vector3 instance to copy the result
	 * @param receiveEndValue Whether receive the transition end coords or current. default is `true`
	 * @category Methods
	 */
	getFocalOffset( out: Vector3, receiveEndValue: boolean = true ): Vector3 {

		const _out = out instanceof Vector3 ? out : new Vector3();
		return _out.copyFrom( receiveEndValue ? this._focalOffsetEnd : this._focalOffset );

	}

	/**
	 * Normalize camera azimuth angle rotation between 0 and 360 degrees.
	 * @category Methods
	 */
	normalizeRotations(): void {

		this._sphericalEnd.theta = this._sphericalEnd.theta % PI_2;
		if ( this._sphericalEnd.theta < 0 ) this._sphericalEnd.theta += PI_2;
		this._spherical.theta += PI_2 * Math.round( ( this._sphericalEnd.theta - this._spherical.theta ) / PI_2 );

	}

	/**
	 * stop all transitions.
	 */
	stop() {

		this._focalOffset.copyFrom( this._focalOffsetEnd );
		this._target.copyFrom( this._targetEnd );
		this._spherical.copyFrom( this._sphericalEnd );
		this._zoom = this._zoomEnd;

	}

	/**
	 * Reset all rotation and position to defaults.
	 * @param enableTransition
	 * @category Methods
	 */
	reset( enableTransition: boolean = false ): Promise<void[]> {

		if (
			! approxEquals( this.camera.entity.transform.worldUp.x, this._cameraUp0.x ) ||
			! approxEquals( this.camera.entity.transform.worldUp.y, this._cameraUp0.y ) ||
			! approxEquals( this.camera.entity.transform.worldUp.z, this._cameraUp0.z )
		) {

			this.camera.entity.transform.worldUp.copyFrom( this._cameraUp0 );
			const position = this.getPosition( _v3A );
			this.updateCameraUp();
			this.setPosition( position.x, position.y, position.z );

		}

		const promises = [
			this.setLookAt(
				this._position0.x, this._position0.y, this._position0.z,
				this._target0.x, this._target0.y, this._target0.z,
				enableTransition,
			),
			this.setFocalOffset(
				this._focalOffset0.x,
				this._focalOffset0.y,
				this._focalOffset0.z,
				enableTransition,
			),
			this.zoomTo( this._zoom0, enableTransition ),
		];

		return Promise.all( promises );

	}

	/**
	 * Set current camera position as the default position.
	 * @category Methods
	 */
	saveState(): void {

		this._cameraUp0.copyFrom( this.camera.entity.transform.worldUp );
		this.getTarget( this._target0 );
		this.getPosition( this._position0 );
		this._zoom0 = this._zoom;
		this._focalOffset0.copyFrom( this._focalOffset );

	}

	/**
	 * Sync camera-up direction.  
	 * When camera-up vector is changed, `.updateCameraUp()` must be called.
	 * @category Methods
	 */
	updateCameraUp(): void {

		this._yAxisUpSpace.setFromUnitVectors( this.camera.entity.transform.worldUp, _AXIS_Y );
		this._yAxisUpSpaceInverse.copyFrom( this._yAxisUpSpace ).invert();

	}

	/**
	 * Apply current camera-up direction to the camera.  
	 * The orbit system will be re-initialized with the current position.
	 * @category Methods
	 */
	applyCameraUp():void {

		const cameraDirection = _v3A.subVectors( this._target, this._camera.position ).normalize();

		// So first find the vector off to the side, orthogonal to both this.object.up and
		// the "view" vector.
		const side = _v3B.crossVectors( cameraDirection, this.camera.entity.transform.worldUp );
		// Then find the vector orthogonal to both this "side" vector and the "view" vector.
		// This vector will be the new "up" vector.
		this.camera.entity.transform.worldUp.crossVectors( side, cameraDirection ).normalize();
		this.camera.entity.transform.worldUpdateMatrixWorld();

		const position = this.getPosition( _v3A );
		this.updateCameraUp();
		this.setPosition( position.x, position.y, position.z );

	}

	/**
	 * Update camera position and directions.  
	 * This should be called in your tick loop every time, and returns true if re-rendering is needed.
	 * @param delta
	 * @returns updated
	 * @category Methods
	 */
	update( delta: number ): boolean {

		const deltaTheta  = this._sphericalEnd.theta  - this._spherical.theta;
		const deltaPhi    = this._sphericalEnd.phi    - this._spherical.phi;
		const deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
		const deltaTarget = _deltaTarget.subVectors( this._targetEnd, this._target );
		const deltaOffset = _deltaOffset.subVectors( this._focalOffsetEnd, this._focalOffset );
		const deltaZoom = this._zoomEnd - this._zoom;

		// update theta
		if ( approxZero( deltaTheta ) ) {

			this._thetaVelocity.value = 0;
			this._spherical.theta = this._sphericalEnd.theta;

		} else {

			const smoothTime = this._isUserControllingRotate ? this.draggingSmoothTime : this.smoothTime;
			this._spherical.theta = smoothDamp( this._spherical.theta, this._sphericalEnd.theta, this._thetaVelocity, smoothTime, Infinity, delta );
			this._needsUpdate = true;

		}

		// update phi
		if ( approxZero( deltaPhi ) ) {

			this._phiVelocity.value = 0;
			this._spherical.phi = this._sphericalEnd.phi;

		} else {

			const smoothTime = this._isUserControllingRotate ? this.draggingSmoothTime : this.smoothTime;
			this._spherical.phi = smoothDamp( this._spherical.phi, this._sphericalEnd.phi, this._phiVelocity, smoothTime, Infinity, delta );
			this._needsUpdate = true;

		}

		// update distance
		if ( approxZero( deltaRadius ) ) {

			this._radiusVelocity.value = 0;
			this._spherical.radius = this._sphericalEnd.radius;

		} else {

			const smoothTime = this._isUserControllingDolly ? this.draggingSmoothTime : this.smoothTime;
			this._spherical.radius = smoothDamp( this._spherical.radius, this._sphericalEnd.radius, this._radiusVelocity, smoothTime, this.maxSpeed, delta );
			this._needsUpdate = true;

		}

		// update target position
		if ( approxZero( deltaTarget.x ) && approxZero( deltaTarget.y ) && approxZero( deltaTarget.z ) ) {

			this._targetVelocity.set( 0, 0, 0 );
			this._target.copyFrom( this._targetEnd );

		} else {

			const smoothTime = this._isUserControllingTruck ? this.draggingSmoothTime : this.smoothTime;
			smoothDampVec3( this._target, this._targetEnd, this._targetVelocity, smoothTime, this.maxSpeed, delta, this._target );
			this._needsUpdate = true;

		}

		// update focalOffset
		if ( approxZero( deltaOffset.x ) && approxZero( deltaOffset.y ) && approxZero( deltaOffset.z ) ) {

			this._focalOffsetVelocity.set( 0, 0, 0 );
			this._focalOffset.copyFrom( this._focalOffsetEnd );

		} else {

			const smoothTime = this._isUserControllingOffset ? this.draggingSmoothTime : this.smoothTime;
			smoothDampVec3( this._focalOffset, this._focalOffsetEnd, this._focalOffsetVelocity, smoothTime, this.maxSpeed, delta, this._focalOffset );
			this._needsUpdate = true;

		}

		// update zoom
		if ( approxZero( deltaZoom ) ) {

			this._zoomVelocity.value = 0;
			this._zoom = this._zoomEnd;

		} else {

			const smoothTime = this._isUserControllingZoom ? this.draggingSmoothTime : this.smoothTime;
			this._zoom = smoothDamp( this._zoom, this._zoomEnd, this._zoomVelocity, smoothTime, Infinity, delta );

		}

		if ( this.dollyToCursor ) {

			if ( isPerspectiveCamera( this._camera ) && this._changedDolly !== 0 ) {

				const dollyControlAmount = this._spherical.radius - this._lastDistance;

				const camera = this._camera;
				const cameraDirection = this._getCameraDirection( _cameraDirection );
				const _t = _v3A.copyFrom( cameraDirection );
				Vector3.cross( _t, camera.entity.transform.worldUp, _t );
				const planeX = _t.normalize();
				if ( planeX.length() === 0 ) planeX.x = 1.0;
				const planeY = _v3B.crossVectors( planeX, cameraDirection );
				const worldToScreen = this._sphericalEnd.radius * Math.tan( camera.getEffectiveFOV() * DEG2RAD * 0.5 );
				const prevRadius = this._sphericalEnd.radius - dollyControlAmount;
				const lerpRatio = ( prevRadius - this._sphericalEnd.radius ) / this._sphericalEnd.radius;
				const cursor = _v3C.copyFrom( this._targetEnd )
					.add( planeX.scale( this._dollyControlCoord.x * worldToScreen * camera.aspect ) )
					.add( planeY.scale( this._dollyControlCoord.y * worldToScreen ) );
				const newTargetEnd = _v3A.copyFrom( this._targetEnd ).lerp( cursor, lerpRatio );

				const isMin = this._lastDollyDirection === DOLLY_DIRECTION.IN && this._spherical.radius <= this.minDistance;
				const isMax = this._lastDollyDirection === DOLLY_DIRECTION.OUT && this.maxDistance <= this._spherical.radius;

				if ( this.infinityDolly && ( isMin || isMax ) ) {

					this._sphericalEnd.radius -= dollyControlAmount;
					this._spherical.radius -= dollyControlAmount;
					const dollyAmount = _v3B.copyFrom( cameraDirection ).scale( - dollyControlAmount );
					newTargetEnd.add( dollyAmount );

				}

				// target position may be moved beyond boundary.
				this._boundary.clampPoint( newTargetEnd, newTargetEnd );
				const targetEndDiff = _v3B.subVectors( newTargetEnd, this._targetEnd );
				this._targetEnd.copyFrom( newTargetEnd );
				this._target.add( targetEndDiff );

				this._changedDolly -= dollyControlAmount;
				if ( approxZero( this._changedDolly ) ) this._changedDolly = 0;

			} else if ( isOrthographicCamera( this._camera ) && this._changedZoom !== 0 ) {

				const dollyControlAmount = this._zoom - this._lastZoom;

				const camera = this._camera;
				const worldCursorPosition = _v3A.set(
					this._dollyControlCoord.x,
					this._dollyControlCoord.y,
					( (camera as any)._frustum.near +  (camera as any)._frustum.far ) / ( (camera as any)._frustum.near - (camera as any)._frustum.far ) 
				).unproject( camera );
				const quaternion = _v3B.set( 0, 0, - 1 ).applyQuaternion( camera.quaternion );
				const cursor = _v3C.copyFrom( worldCursorPosition ).add( quaternion.scale( - worldCursorPosition.dot( camera.up ) ) );
				const prevZoom = this._zoom - dollyControlAmount;
				const lerpRatio = - ( prevZoom - this._zoom ) / this._zoom;

				// find the "distance" (aka plane constant in three.js) of Plane
				// from a given position (this._targetEnd) and normal vector (cameraDirection)
				// https://www.maplesoft.com/support/help/maple/view.aspx?path=MathApps%2FEquationOfAPlaneNormal#bkmrk0
				const cameraDirection = this._getCameraDirection( _cameraDirection );
				const prevPlaneConstant = Vector3.dot( this._targetEnd, cameraDirection );
				const newTargetEnd = new Vector3();
				Vector3.lerp(_v3A.copyFrom( this._targetEnd ), cursor, lerpRatio, newTargetEnd);
				const newPlaneConstant = Vector3.dot( newTargetEnd, cameraDirection );

				// Pull back the camera depth that has moved, to be the camera stationary as zoom
				const pullBack = cameraDirection.scale( newPlaneConstant - prevPlaneConstant );
				newTargetEnd.subtract( pullBack );

				// target position may be moved beyond boundary.
				this._boundary.clampPoint( newTargetEnd, newTargetEnd );
				
				Vector3.subtract(newTargetEnd, this._targetEnd, _v3B);
				// const targetEndDiff = _v3B.subVectors( newTargetEnd, this._targetEnd );
				this._targetEnd.copyFrom( newTargetEnd );
				this._target.add( _v3B );

				// this._target.copyFrom( this._targetEnd );

				this._changedZoom -= dollyControlAmount;
				if ( approxZero( this._changedZoom ) ) this._changedZoom = 0;

			}

		}

		if ( this._camera.zoom !== this._zoom ) {

			this._camera.zoom = this._zoom;
			// this.camera.entity.transform.worldUpdateProjectionMatrix();
			this._updateNearPlaneCorners();
			this._needsUpdate = true;

		}

		this._dragNeedsUpdate = true;

		// collision detection
		const maxDistance = this._collisionTest();
		this._spherical.radius = Math.min( this._spherical.radius, maxDistance );

		// decompose spherical to the camera position
		this._spherical.makeSafe();
		this._camera.entity.transform.position.setFromSpherical( this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ).add( this._target );
		this._camera.entity.transform.lookAt( this._target );

		// set offset after the orbit movement
		const affectOffset =
			! approxZero( this._focalOffset.x ) ||
			! approxZero( this._focalOffset.y ) ||
			! approxZero( this._focalOffset.z );
		if ( affectOffset ) {

			this.camera.entity.transform.worldUpdateMatrixWorld();
			_xColumn.setFromMatrixColumn( this._camera.matrix, 0 );
			_yColumn.setFromMatrixColumn( this._camera.matrix, 1 );
			_zColumn.setFromMatrixColumn( this._camera.matrix, 2 );
			_xColumn.scale(   this._focalOffset.x );
			_yColumn.scale( - this._focalOffset.y );
			_zColumn.scale(   this._focalOffset.z ); // notice: z-offset will not affect in Orthographic.

			_v3A.copyFrom( _xColumn ).add( _yColumn ).add( _zColumn );
			this._camera.entity.transform.position.add( _v3A );

		}

		if ( this._boundaryEnclosesCamera ) {

			this._encloseToBoundary(
				this._camera.entity.transform.position.copyFrom( this._target ),
				_v3A.setFromSpherical( this._spherical ).applyQuaternion( this._yAxisUpSpaceInverse ),
				1.0,
			);

		}

		const updated = this._needsUpdate;

		if ( updated && ! this._updatedLastTime ) {

			this._hasRested = false;
			this.dispatchEvent( { type: 'wake' } );
			this.dispatchEvent( { type: 'update' } );

		} else if ( updated ) {

			this.dispatchEvent( { type: 'update' } );

			if (
				approxZero( deltaTheta, this.restThreshold ) &&
				approxZero( deltaPhi, this.restThreshold ) &&
				approxZero( deltaRadius, this.restThreshold ) &&
				approxZero( deltaTarget.x, this.restThreshold ) &&
				approxZero( deltaTarget.y, this.restThreshold ) &&
				approxZero( deltaTarget.z, this.restThreshold ) &&
				approxZero( deltaOffset.x, this.restThreshold ) &&
				approxZero( deltaOffset.y, this.restThreshold ) &&
				approxZero( deltaOffset.z, this.restThreshold ) &&
				approxZero( deltaZoom, this.restThreshold ) &&
				! this._hasRested
			) {

				this._hasRested = true;
				this.dispatchEvent( { type: 'rest' } );

			}

		} else if ( ! updated && this._updatedLastTime ) {

			this.dispatchEvent( { type: 'sleep' } );

		}

		this._lastDistance = this._spherical.radius;
		this._lastZoom = this._zoom;

		this._updatedLastTime = updated;
		this._needsUpdate = false;

		return updated;

	}

	/**
	 * Get all state in JSON string
	 * @category Methods
	 */
	toJSON(): string {

		return JSON.stringify( {
			enabled              : this._enabled,

			minDistance          : this.minDistance,
			maxDistance          : infinityToMaxNumber( this.maxDistance ),
			minZoom              : this.minZoom,
			maxZoom              : infinityToMaxNumber( this.maxZoom ),
			minPolarAngle        : this.minPolarAngle,
			maxPolarAngle        : infinityToMaxNumber( this.maxPolarAngle ),
			minAzimuthAngle      : infinityToMaxNumber( this.minAzimuthAngle ),
			maxAzimuthAngle      : infinityToMaxNumber( this.maxAzimuthAngle ),
			smoothTime           : this.smoothTime,
			draggingSmoothTime   : this.draggingSmoothTime,
			dollySpeed           : this.dollySpeed,
			truckSpeed           : this.truckSpeed,
			dollyToCursor        : this.dollyToCursor,
			verticalDragToForward: this.verticalDragToForward,

			target               : [this._targetEnd.x, this._targetEnd.y, this._targetEnd.z],
			position             : _v3A.setFromSpherical( this._sphericalEnd ).add( this._targetEnd ).toArray(),
			zoom                 : this._zoomEnd,
			focalOffset          : [this._focalOffsetEnd.x, this._focalOffsetEnd.y, this._focalOffsetEnd.z],

			target0              : [this._target0.x, this._target0.y, this._target0.z],
			position0            : [this._position0.x, this._position0.y, this._position0.z],
			zoom0                : this._zoom0,
			focalOffset0         : [this._focalOffset0.x, this._focalOffset0.y, this._focalOffset0.z],
		} );

	}

	/**
	 * Reproduce the control state with JSON. enableTransition is where anim or not in a boolean.
	 * @param json
	 * @param enableTransition
	 * @category Methods
	 */
	fromJSON( json: string, enableTransition: boolean = false ): void {

		const obj = JSON.parse( json );

		this.enabled               = obj.enabled;

		this.minDistance           = obj.minDistance;
		this.maxDistance           = maxNumberToInfinity( obj.maxDistance );
		this.minZoom               = obj.minZoom;
		this.maxZoom               = maxNumberToInfinity( obj.maxZoom );
		this.minPolarAngle         = obj.minPolarAngle;
		this.maxPolarAngle         = maxNumberToInfinity( obj.maxPolarAngle );
		this.minAzimuthAngle       = maxNumberToInfinity( obj.minAzimuthAngle );
		this.maxAzimuthAngle       = maxNumberToInfinity( obj.maxAzimuthAngle );
		this.smoothTime            = obj.smoothTime;
		this.draggingSmoothTime    = obj.draggingSmoothTime;
		this.dollySpeed            = obj.dollySpeed;
		this.truckSpeed            = obj.truckSpeed;
		this.dollyToCursor         = obj.dollyToCursor;
		this.verticalDragToForward = obj.verticalDragToForward;

		this._target0.copyFromArray( obj.target0 );
		this._position0.copyFromArray( obj.position0 );
		this._zoom0 = obj.zoom0;
		this._focalOffset0.copyFromArray( obj.focalOffset0 );

		this.moveTo( obj.target[ 0 ], obj.target[ 1 ], obj.target[ 2 ], enableTransition );
		
		_v3A.copyFromArray( obj.position ).subtract( this._targetEnd )
		Vector3.transformByQuat(_v3A, this._yAxisUpSpaceInverse, _v3A)
		_sphericalA.setFromVector3(_v3A);
		this.rotateTo( _sphericalA.theta, _sphericalA.phi, enableTransition );
		this.dollyTo( _sphericalA.radius, enableTransition );
		this.zoomTo( obj.zoom, enableTransition );
		this.setFocalOffset( obj.focalOffset[ 0 ], obj.focalOffset[ 1 ], obj.focalOffset[ 2 ], enableTransition );

		this._needsUpdate = true;

	}

	/**
	 * Attach all internal event handlers to enable drag control.
	 * @category Methods
	 */
	connect( domElement: HTMLElement ): void {

		if ( this._domElement ) {

			console.warn( 'camera-controls is already connected.' );
			return;

		}

		domElement.setAttribute( 'data-camera-controls-version', VERSION );
		this._addAllEventListeners( domElement );
		this._getClientRect( this._elementRect );

	}

	/**
	 * Detach all internal event handlers to disable drag control.
	 */
	disconnect() {

		this.cancel();
		this._removeAllEventListeners();

		if ( this._domElement ) {

			this._domElement.removeAttribute( 'data-camera-controls-version' );
			this._domElement = undefined;

		}

	}

	/**
	 * Dispose the cameraControls instance itself, remove all eventListeners.
	 * @category Methods
	 */
	dispose(): void {

		// remove all user event listeners
		this.removeAllEventListeners();
		// remove all internal event listeners
		this.disconnect();

	}

	// it's okay to expose public though
	protected _getTargetDirection( out: Vector3 ): Vector3 {
		const { radius, phi, theta } = this._spherical;

		  // setFromSpherical
			out.x = radius * Math.sin(theta) * Math.sin(phi);
			out.y = radius * Math.cos(phi);
			out.z = radius * Math.sin(phi) * Math.cos(theta);

			  
			// divideScalar
			out.x /= radius;
			out.y /= radius;
			out.z /= radius;

			// applyQuaternion
			const { x, y, z, w } = this._yAxisUpSpaceInverse;
			const ix =  w * out.x + y * out.z - z * out.y;
			const iy =  w * out.y + z * out.x - x * out.z;
			const iz =  w * out.z + x * out.y - y * out.x;
			const iw = -x * out.x - y * out.y - z * out.z;
			
			out.x = ix * w - iw * x - iy * z + iz * y;
			out.y = iy * w - iw * y - iz * x + ix * z;
			out.z = iz * w - iw * z - ix * y + iy * x;

			return out;

		// divide by distance to normalize, lighter than `Vector3.prototype.normalize()`
		// return out.setFromSpherical( this._spherical ).divideScalar( this._spherical.radius ).applyQuaternion( this._yAxisUpSpaceInverse );

	}

	// it's okay to expose public though
	protected _getCameraDirection( out: Vector3 ): Vector3 {

		return this._getTargetDirection( out ).negate();

	}

	protected _findPointerById( pointerId: number ): PointerInput | undefined {

		return this._activePointers.find( ( activePointer ) => activePointer.pointerId === pointerId );

	}

	protected _findPointerByMouseButton( mouseButton: MOUSE_BUTTON ): PointerInput | undefined {

		return this._activePointers.find( ( activePointer ) => activePointer.mouseButton === mouseButton );

	}


	protected _disposePointer( pointer: PointerInput ): void {

		this._activePointers.splice( this._activePointers.indexOf( pointer ), 1 );

	}

	protected _encloseToBoundary( position: Vector3, offset: Vector3, friction: number ): Vector3 {

		const offsetLength2 = offset.lengthSquared();

		if ( offsetLength2 === 0.0 ) { // sanity check

			return position;

		}

		// See: https://twitter.com/FMS_Cat/status/1106508958640988161
		const newTarget = _v3B.copyFrom( offset ).add( position ); // target
		const clampedTarget = this._boundary.clampPoint( newTarget, _v3C ); // clamped target
		const deltaClampedTarget = clampedTarget.sub( newTarget ); // newTarget -> clampedTarget
		const deltaClampedTargetLength2 = deltaClampedTarget.lengthSq(); // squared length of deltaClampedTarget

		if ( deltaClampedTargetLength2 === 0.0 ) { // when the position doesn't have to be clamped

			return position.add( offset );

		} else if ( deltaClampedTargetLength2 === offsetLength2 ) { // when the position is completely stuck

			return position;

		} else if ( friction === 0.0 ) {

			return position.add( offset ).add( deltaClampedTarget );

		} else {

			const offsetFactor = 1.0 + friction * deltaClampedTargetLength2 / Vector3.dot(offset, deltaClampedTarget);

			return position
				.add( _v3B.copyFrom( offset ).scale( offsetFactor ) )
				.add( deltaClampedTarget.scale( 1.0 - friction ) );

		}

	}

	protected _updateNearPlaneCorners(): void {

		if ( isPerspectiveCamera( this._camera ) )  {

			const camera = this._camera;
			const near = camera.nearClipPlane;
			
			// TODO `fov = camera.fieldOfView` or `fov = camera.getEffectiveFOV() * DEG2RAD` ?
			const fov = camera.fieldOfView * DEG2RAD;
			const heightHalf = Math.tan( fov * 0.5 ) * near; // near plain half height
			const widthHalf = heightHalf * camera.aspectRatio; // near plain half width
			this._nearPlaneCorners[ 0 ].set( - widthHalf, - heightHalf, 0 );
			this._nearPlaneCorners[ 1 ].set(   widthHalf, - heightHalf, 0 );
			this._nearPlaneCorners[ 2 ].set(   widthHalf,   heightHalf, 0 );
			this._nearPlaneCorners[ 3 ].set( - widthHalf,   heightHalf, 0 );

		} else if ( isOrthographicCamera( this._camera ) ) {

			const camera = this._camera;
			const zoomInv = 1 / camera.zoom;
			const left   = (camera as any)._frustum.left   * zoomInv;
			const right  = (camera as any)._frustum.right  * zoomInv;
			const top    = (camera as any)._frustum.top    * zoomInv;
			const bottom = (camera as any)._frustum.bottom * zoomInv;

			this._nearPlaneCorners[ 0 ].set( left,  top,    0 );
			this._nearPlaneCorners[ 1 ].set( right, top,    0 );
			this._nearPlaneCorners[ 2 ].set( right, bottom, 0 );
			this._nearPlaneCorners[ 3 ].set( left,  bottom, 0 );

		}

	}

	protected _truckInternal = ( deltaX: number, deltaY: number, dragToOffset: boolean ): void => {

		let truckX: number;
		let pedestalY: number;

		if ( isPerspectiveCamera( this._camera ) ) {

			const offset = _v3A.copyFrom( this._camera.entity.transform.position ).subtract( this._target );
			// half of the fov is center to top of screen
			const fov = this._camera.fieldOfView * DEG2RAD;
			const targetDistance = offset.length() * Math.tan( fov * 0.5 );

			truckX    = ( this.truckSpeed * deltaX * targetDistance / this._elementRect.height );
			pedestalY = ( this.truckSpeed * deltaY * targetDistance / this._elementRect.height );

		} else if ( isOrthographicCamera( this._camera ) ) {

			const camera = this._camera;

			truckX    = deltaX * ( (camera as any)._frustum.right - (camera as any)._frustum.left   ) / camera.zoom / this._elementRect.width;
			pedestalY = deltaY * ( (camera as any)._frustum.top   - (camera as any)._frustum.bottom ) / camera.zoom / this._elementRect.height;

		} else {

			return;

		}

		if ( this.verticalDragToForward ) {

			dragToOffset ?
				this.setFocalOffset(
					this._focalOffsetEnd.x + truckX,
					this._focalOffsetEnd.y,
					this._focalOffsetEnd.z,
					true,
				) :
				this.truck( truckX, 0, true );

			this.forward( - pedestalY, true );

		} else {

			dragToOffset ?
				this.setFocalOffset(
					this._focalOffsetEnd.x + truckX,
					this._focalOffsetEnd.y + pedestalY,
					this._focalOffsetEnd.z,
					true,
				) :
				this.truck( truckX, pedestalY, true );

		}

	};

	protected _rotateInternal = ( deltaX: number, deltaY: number ): void => {

		const theta = PI_2 * this.azimuthRotateSpeed * deltaX / this._elementRect.height; // divide by *height* to refer the resolution
		const phi   = PI_2 * this.polarRotateSpeed   * deltaY / this._elementRect.height;
		this.rotate( theta, phi, true );

	};

	protected _dollyInternal = ( delta: number, x: number, y : number ): void => {

		const dollyScale = Math.pow( 0.95, - delta * this.dollySpeed );
		const lastDistance = this._sphericalEnd.radius;
		const distance = this._sphericalEnd.radius * dollyScale;
		const clampedDistance = clamp( distance, this.minDistance, this.maxDistance );
		const overflowedDistance = clampedDistance - distance;

		if ( this.infinityDolly && this.dollyToCursor ) {

			this._dollyToNoClamp( distance, true );

		} else if ( this.infinityDolly && ! this.dollyToCursor ) {

			this.dollyInFixed( overflowedDistance, true );
			this._dollyToNoClamp( clampedDistance, true );

		} else {

			this._dollyToNoClamp( clampedDistance, true );

		}

		if ( this.dollyToCursor ) {

			this._changedDolly += ( this.infinityDolly ? distance : clampedDistance ) - lastDistance;
			this._dollyControlCoord.set( x, y );

		}

		this._lastDollyDirection = Math.sign( - delta ) as DOLLY_DIRECTION;

	};

	protected _zoomInternal = ( delta: number, x: number, y: number ): void => {

		const zoomScale = Math.pow( 0.95, delta * this.dollySpeed );
		const lastZoom = this._zoom;
		const zoom = this._zoom * zoomScale;

		// for both PerspectiveCamera and OrthographicCamera
		this.zoomTo( zoom, true );

		if ( this.dollyToCursor ) {

			this._changedZoom += zoom - lastZoom;
			this._dollyControlCoord.set( x, y );

		}

	};

	// lateUpdate
	protected _collisionTest(): number {

		let distance = Infinity;

		const hasCollider = this.colliderMeshes.length >= 1;
		if ( ! hasCollider ) return distance;

		if ( notSupportedInOrthographicCamera( this._camera, '_collisionTest' ) ) return distance;

		const rayDirection = this._getTargetDirection( _cameraDirection );
		
		Matrix.lookAt(_ORIGIN, rayDirection, this.camera.entity.transform.worldUp, _rotationMatrix);

		for ( let i = 0; i < 4; i ++ ) {

			const nearPlaneCorner = _v3B.copyFrom( this._nearPlaneCorners[ i ] );
			// nearPlaneCorner.applyMatrix4( _rotationMatrix );

			const _x = nearPlaneCorner.x;
			const _y = nearPlaneCorner.y;
			const _z = nearPlaneCorner.z;
			const e = _rotationMatrix.elements;

			const w =  1 / ( e[ 3 ] * _x + e[ 7 ] * _y + e[ 11 ] * _z + e[ 15 ] );
			const x = ( e[ 0 ] * _x + e[ 4 ] * _y + e[ 8 ] * _z + e[ 12 ] ) * w;
			const y = ( e[ 1 ] * _x + e[ 5 ] * _y + e[ 9 ] * _z + e[ 13 ] ) * w;
			const z = ( e[ 2 ] * _x + e[ 6 ] * _y + e[ 10 ] * _z + e[ 14 ] ) * w;

			nearPlaneCorner.set( x, y, z );

			
			const origin = Vector3.add(nearPlaneCorner, this._target, new Vector3());

			_raycaster.set( origin, rayDirection );
			_raycaster.far = this._spherical.radius + 1;

			const intersects = _raycaster.intersectObjects( this.colliderMeshes );

			if ( intersects.length !== 0 && intersects[ 0 ].distance < distance ) {

				distance = intersects[ 0 ].distance;

			}

		}

		return distance;

	}

	/**
	 * Get its client rect and package into given `DOMRect` .
	 */
	protected _getClientRect( target: DOMRect ): DOMRect | undefined {

		if ( ! this._domElement ) return;

		const rect = this._domElement.getBoundingClientRect();

		target.x = rect.left;
		target.y = rect.top;

		if ( this._viewport ) {

			target.x += this._viewport.x;
			target.y += rect.height - this._viewport.w - this._viewport.y;
			target.width = this._viewport.z;
			target.height = this._viewport.w;

		} else {

			target.width = rect.width;
			target.height = rect.height;

		}

		return target;

	}

	protected _createOnRestPromise( resolveImmediately: boolean ): Promise<void> {

		if ( resolveImmediately ) return Promise.resolve();

		this._hasRested = false;
		this.dispatchEvent( { type: 'transitionstart' } );

		return new Promise( ( resolve ) => {

			const onResolve = () => {

				this.removeEventListener( 'rest', onResolve );
				resolve();

			};

			this.addEventListener( 'rest', onResolve );

		} );

	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected _addAllEventListeners( _domElement: HTMLElement ): void {}

	protected _removeAllEventListeners(): void {}

	/**
	 * backward compatible
	 * @deprecated use smoothTime (in seconds) instead
	 * @category Properties
	 */
	get dampingFactor() {

		console.warn( '.dampingFactor has been deprecated. use smoothTime (in seconds) instead.' );
		return 0;

	}

	/**
	 * backward compatible
	 * @deprecated use smoothTime (in seconds) instead
	 * @category Properties
	 */
	set dampingFactor( _: number ) {

		console.warn( '.dampingFactor has been deprecated. use smoothTime (in seconds) instead.' );

	}

	/**
	 * backward compatible
	 * @deprecated use draggingSmoothTime (in seconds) instead
	 * @category Properties
	 */
	get draggingDampingFactor() {

		console.warn( '.draggingDampingFactor has been deprecated. use draggingSmoothTime (in seconds) instead.' );
		return 0;

	}

	/**
	 * backward compatible
	 * @deprecated use draggingSmoothTime (in seconds) instead
	 * @category Properties
	 */
	set draggingDampingFactor( _: number ) {

		console.warn( '.draggingDampingFactor has been deprecated. use draggingSmoothTime (in seconds) instead.' );

	}
	
	static createBoundingSphere( entity: Entity, out = new BoundingSphere() ): BoundingSphere {
		const boundingSphere = out;

		_box3A.min.x = _box3A.min.y = _box3A.min.z = Infinity;
		_box3A.max.x = _box3A.max.y = _box3A.max.z = -Infinity;

    const renderers = entity.getComponentsIncludeChildren(MeshRenderer, []);
    // Merge the bounding boxes of the rest of the renderers.
    for (let i = 0; i < renderers.length; i++) {
      BoundingBox.merge(_box3A, renderers[i].bounds, _box3A);
    }

		BoundingSphere.fromBox( _box3A, boundingSphere );

		return boundingSphere;
	}

}
