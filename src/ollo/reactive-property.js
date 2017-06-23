import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';

export class ReactiveProperty extends Subject {
    constructor( v ) {
        super();

        var value = v;
        this.notifyOnSubscribe = arguments.length > 0;

        Object.defineProperty( this, 'value', {
            get: () => value,
            set: function ( v ) {
                value = v;
                this.next( v );
            }
        });
        
    }
    _subscribe( subscriber ) {
        var result = super._subscribe( subscriber );
        if ( result != Subscription.EMPTY ) {
            subscriber.next( this.value );
        }
        return result;
    }
}

export default ReactiveProperty;
