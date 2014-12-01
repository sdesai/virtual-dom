var Rx = require('rx'),

    eq = function(eqVal) {
        return function(v) {
            return v === eqVal;
        };
    },

    Observable = Rx.Observable;

function flatten(asyncVirtualDom) {

    return Observable.createWithDisposable(function subscribe(observer) {
        var disposables = new Rx.CompositeDisposable;

        function waitFor(obs, parent, key) {
            // TODO: takeUntil parent is changed?
            ++refCount;
            disposables.add(
                obs.observeOn(Rx.Scheduler.timeout)
                    .subscribe(function(value) {
                        parent[key] = traverse(value);
                        observer.onNext(result);
                    }, onError, decrementRefCount)
            )
        }

        function onError(error) {
            observer.onError(error);
            disposables.dispose();
        }

        function decrementRefCount() {
            --refCount;
            if (refCount <= 0) {
                observer.onCompleted();
                disposables.dispose();
            }
        }

        function traverse(obj) {
            if (typeof obj !== 'object' || !obj) {
                return obj;
            }
            var result = {};
            for (var key in obj) {
                var value = obj[key];
                if (value instanceof Observable) {
                    waitFor(value, result, key);
                } else {
                    result[key] = traverse(value);
                }
            }
            return result;
        }

        var refCount = 1;
        var result = traverse(asyncVirtualDom);

        observer.onNext(result);
        decrementRefCount();
    })
}

function getTree2(tree) {

    return Observable.createWithDisposable(function subscribe(observer) {

        var disposables = new Rx.CompositeDisposable;

        var willOnNext = false;

        function onNextWhenDone() {
            // console.log("onNextWhenDone:" + willOnNext);
            var oldValue = willOnNext;
            willOnNext = true;
            return oldValue !== willOnNext;
        }

        function onNextDomFragment() {
            // console.log("onNextDomFragment:" + result);
            willOnNext = false;
            observer.onNext(result);
        }

        function waitFor(obs, parent, index) {

            // TODO: takeUntil parent is changed?

            ++refCount;

            disposables.add(
                obs.subscribe(function(value) {
                    var shouldOnNext = false;
                    if (value instanceof Observable) {
                        waitFor(value, result, index);
                    } else {
                        parent[index] = traverse(value);
                        shouldOnNext = onNextWhenDone();
                    }
                    if (shouldOnNext) {
                        onNextDomFragment();
                    }
                }, onError, decrementRefCount)
            )
        }

        function onError(error) {
            observer.onError(error);
            disposables.dispose();
        }

        function decrementRefCount() {

            --refCount;

            if (refCount <= 0) {
                observer.onCompleted();
                disposables.dispose();
            }
        }

        function traverse(obj) {
            if (!(obj instanceof Array) {
                return obj;
            }

            if (obj instanceof Array) {
                var result = [];

                obj.forEach(function(value, index) {
                    if (value instanceof Observable) {
                        waitFor(value, result, index);
                    } else {
                        result[index] = traverse(value);
                    }
                });

                return result;
            }
        }

        var refCount = 1;

        onNextWhenDone();

        var result = traverse(tree);

        onNextDomFragment();

        decrementRefCount();
    })
}


var print = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    console.log.apply(console, args.map(function(value) {
        return JSON.stringify(value);
    }));
}

var disposable = flatten({
    x: Observable.of(10),
    y: {
        z: 2,
        w: Observable.of(3, {
            q: Observable.of(4).delay(100)
        }, 5, 6)
    }
}).subscribe(
    print,
    print.bind(null, 'error'),
    print.bind(null, 'complete'));