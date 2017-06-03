import Rx from 'rxjs';

function make ( v ) {
    var value = v;
    var subject = new Rx.Subject();
    
    Object.defineProperty( subject, 'value', {
        get: () => value,
        set: ( v ) => {
            console.log( 'value updated' );
            value = v;
            subject.next( v );
        }
    });

    return subject;
}

var ReactiveProperty = {
    make: make
};

export default ReactiveProperty;
