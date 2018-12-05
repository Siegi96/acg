
function drivePlane(timeInMilliSeconds) {
    let keyframe1 = 5000;
    let keyframe2 = 50000;
    let x = -3;
    let z = 0;
    let y = 0;

    if(timeInMilliSeconds < keyframe1) {
        let percent = calcProzent(timeInMilliSeconds, keyframe1);
        x = lerp(-3, 5, percent);
    } else {
        let percent = calcProzent((timeInMilliSeconds-keyframe1), (keyframe2-keyframe1));
        if(percent >= 1) percent = 1;
        x = lerp(5, -3, percent);
        y = lerp(0, 3, percent);
    }

    piperNode.matrix = glm.translate(x,y,z);
    return x;
}

function calcProzent(timeInMilliseconds, keyFrame){
    return timeInMilliseconds/keyFrame;
}
function lerp(a, b, n) {
    return (1 - n) * a + n * b;
}