import { Camera } from '@galacean/engine';

export function notSupportedInOrthographicCamera(
	camera: Camera,
	message: string
) {

	if ( camera.isOrthographic ) {

		console.warn( `${ message } is not supported in OrthographicCamera` );
		return true;

	}

	return false;

}
