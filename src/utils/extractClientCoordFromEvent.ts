import type * as _GALACEAN  from '@galacean/engine';
import type { PointerInput } from '../types';

export function extractClientCoordFromEvent( pointers: PointerInput[], out: _GALACEAN.Vector2 ) {

	out.set( 0, 0 );

	pointers.forEach( ( pointer ) => {

		out.x += pointer.clientX;
		out.y += pointer.clientY;

	} );

	out.x /= pointers.length;
	out.y /= pointers.length;

}
