import * as THREE from "three";

import { ARButton }
    from "three/addons/webxr/ARButton.js";

import { OrbitControls }
    from "three/addons/Controls/OrbitControls.js";

import { GLTFLoader }
    from "three/addons/utils/GLTFLoader.js";

import { RGBELoader }
    from "three/addons/Decor/RGBELoader.js";


// ======================================================
// VARIABLES
// ======================================================

let scene;
let camera;
let renderer;

let reticle;
let pmremGenerator;

let current_object = null;
let controls;
let envmap;

let current_url = "1";

// Variables pour le HIT-TEST WebXR
let hitTestSource = null;
let hitTestSourceRequested = false;


// ======================================================
// INITIALISATION
// ======================================================

init();


// ======================================================
// INIT
// ======================================================

function init() {

    // --------------------------------------------------
    // SCENE
    // --------------------------------------------------

    scene = new THREE.Scene();


    // --------------------------------------------------
    // CAMERA
    // --------------------------------------------------

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    camera.position.set(0, 1, 3);


    // --------------------------------------------------
    // RENDERER
    // --------------------------------------------------

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(
        window.devicePixelRatio
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.xr.enabled = true;

    document
        .getElementById("container")
        .appendChild(
            renderer.domElement
        );


    // --------------------------------------------------
    // PMREM
    // --------------------------------------------------

    pmremGenerator =
        new THREE.PMREMGenerator(
            renderer
        );

    pmremGenerator.compileEquirectangularShader();


    // --------------------------------------------------
    // ORBIT CONTROLS
    // --------------------------------------------------

    controls =
        new OrbitControls(
            camera,
            renderer.domElement
        );

    controls.addEventListener(
        "change",
        render
    );

    controls.minDistance = 2;
    controls.maxDistance = 10;

    controls.target.set(
        0,
        0,
        -0.2
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;


    // --------------------------------------------------
    // LUMIERE
    // --------------------------------------------------

    const directionalLight =
        new THREE.DirectionalLight(
            0xdddddd,
            1
        );

    directionalLight.position
        .set(0, 0, 1)
        .normalize();

    scene.add(
        directionalLight
    );


    const ambientLight =
        new THREE.AmbientLight(
            0x222222
        );

    scene.add(
        ambientLight
    );


    // --------------------------------------------------
    // RETICLE
    // --------------------------------------------------

    const geometry =
        new THREE.RingGeometry(
            0.15,
            0.20,
            32
        );

    geometry.rotateX(
        -Math.PI / 2
    );


    const material =
        new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide
        });


    reticle =
        new THREE.Mesh(
            geometry,
            material
        );

    // La position du reticle sera
    // donnée par le hit-test

    reticle.matrixAutoUpdate = false;

    reticle.visible = false;

    scene.add(
        reticle
    );


    // ==================================================
    // CONFIGURATION AR
    // ==================================================

    const options = {

        requiredFeatures: [
            "hit-test"
        ],

        optionalFeatures: [
            "dom-overlay"
        ],

        domOverlay: {
            root: document.body
        }

    };


    document.body.appendChild(
        ARButton.createButton(
            renderer,
            options
        )
    );


    // --------------------------------------------------
    // DEBUT DE SESSION AR
    // --------------------------------------------------

    renderer.xr.addEventListener(
        "sessionstart",
        function () {

            console.log(
                "================================"
            );

            console.log(
                "Session AR démarrée"
            );

            console.log(
                "================================"
            );


            hitTestSource = null;

            hitTestSourceRequested = false;


            reticle.visible = false;


            // Cacher le modèle au début
            // de la session AR

            if (current_object) {

                current_object.visible =
                    false;

            }


            // Récupération de la session

            const session =
                renderer.xr.getSession();


            console.log(
                "Session XR :",
                session
            );


            // Evénement SELECT

            session.addEventListener(
                "select",
                onSelect
            );


            console.log(
                "Event SELECT installé"
            );

        }
    );


    // --------------------------------------------------
    // FIN DE SESSION AR
    // --------------------------------------------------

    renderer.xr.addEventListener(
        "sessionend",
        function () {

            console.log(
                "Session AR terminée"
            );


            hitTestSource = null;

            hitTestSourceRequested =
                false;


            reticle.visible = false;


            if (current_object) {

                current_object.visible =
                    true;

            }

        }
    );


    // --------------------------------------------------
    // RESIZE
    // --------------------------------------------------

    window.addEventListener(
        "resize",
        onWindowResize
    );


    // --------------------------------------------------
    // BOUCLE DE RENDU
    // --------------------------------------------------

    renderer.setAnimationLoop(
        render
    );


    // --------------------------------------------------
    // MODELE PAR DEFAUT
    // --------------------------------------------------

    loadModel(
        current_url
    );
}


// ======================================================
// MENU DES MODELES
// ======================================================

$(".ar-object").click(
    function () {

        current_url =
            $(this).attr("id");


        // On ne change pas le modèle
        // pendant une session AR

        if (
            !renderer.xr.isPresenting
        ) {

            if (current_object) {

                scene.remove(
                    current_object
                );

                current_object =
                    null;

            }


            loadModel(
                current_url
            );

        }

    }
);


// ======================================================
// CHARGEMENT DU MODELE GLB
// ======================================================

function loadModel(model) {

    console.log(
        "Chargement de : "
        + model
        + ".glb"
    );


    // --------------------------------------------------
    // CHARGEMENT DU HDR
    // --------------------------------------------------

    new RGBELoader()

        .setDataType(
            THREE.HalfFloatType
        )

        // Ton HDR est à la racine

        .setPath("")

        .load(

            "lakeside_sunrise_2k.hdr",

            function (texture) {

                console.log(
                    "HDR chargé"
                );


                // Création de l'environnement

                envmap =
                    pmremGenerator
                        .fromEquirectangular(
                            texture
                        )
                        .texture;


                texture.flipY = false;

                texture.premultiplyAlpha =
                    false;


                scene.environment =
                    envmap;


                texture.dispose();


                // --------------------------------------------------
                // CHARGEMENT DU GLB
                // --------------------------------------------------

                const loader =
                    new GLTFLoader()
                        .setPath("3d/");


                loader.load(

                    model + ".glb",


                    function (glb) {

                        console.log(
                            "GLB chargé : "
                            + model
                            + ".glb"
                        );


                        current_object =
                            glb.scene;


                        // Ajouter l'objet
                        // à la scène

                        scene.add(
                            current_object
                        );


                        // --------------------------------------------------
                        // POSITION POUR LE MODE NAVIGATEUR
                        // --------------------------------------------------

                        current_object.position.set(
                            0,
                            0,
                            -2
                        );


                        // --------------------------------------------------
                        // CENTRAGE
                        // --------------------------------------------------

                        const box =
                            new THREE.Box3();


                        box.setFromObject(
                            current_object
                        );


                        box.getCenter(
                            controls.target
                        );


                        controls.update();


                        // Affichage

                        current_object.visible =
                            true;


                        render();

                    },


                    // --------------------------------------------------
                    // PROGRESSION
                    // --------------------------------------------------

                    function (xhr) {

                        if (
                            xhr.total > 0
                        ) {

                            const percent =
                                (
                                    xhr.loaded /
                                    xhr.total
                                ) * 100;


                            console.log(
                                "Chargement : "
                                + percent.toFixed(0)
                                + "%"
                            );

                        }

                    },


                    // --------------------------------------------------
                    // ERREUR GLB
                    // --------------------------------------------------

                    function (error) {

                        console.error(
                            "Erreur de chargement du GLB :",
                            error
                        );

                    }

                );

            },


            undefined,


            // --------------------------------------------------
            // ERREUR HDR
            // --------------------------------------------------

            function (error) {

                console.error(
                    "Erreur de chargement du HDR :",
                    error
                );

            }

        );
}


// ======================================================
// HIT-TEST
// ======================================================

function setupHitTestSource() {

    const session =
        renderer.xr.getSession();


    if (!session) {

        console.error(
            "Pas de session XR pour le Hit-test"
        );

        return;
    }


    console.log(
        "Création du Hit-test..."
    );


    // --------------------------------------------------
    // ESPACE "VIEWER"
    // --------------------------------------------------

    session
        .requestReferenceSpace(
            "viewer"
        )
        .then(
            function (referenceSpace) {

                console.log(
                    "Reference space VIEWER obtenu"
                );


                return session
                    .requestHitTestSource({
                        space: referenceSpace
                    });

            }
        )
        .then(
            function (source) {

                hitTestSource =
                    source;


                console.log(
                    "================================"
                );

                console.log(
                    "✅ HIT-TEST ACTIVÉ"
                );

                console.log(
                    "================================"
                );

            }
        )
        .catch(
            function (error) {

                console.error(
                    "❌ ERREUR HIT-TEST :",
                    error
                );

            }
        );


    // --------------------------------------------------
    // FIN DE SESSION
    // --------------------------------------------------

    session.addEventListener(
        "end",
        function () {

            hitTestSource =
                null;

            hitTestSourceRequested =
                false;

        }
    );
}


// ======================================================
// SELECT
// ======================================================

function onSelect() {

    console.log(
        "================================"
    );

    console.log(
        "SELECT détecté"
    );

    console.log(
        "================================"
    );


    // --------------------------------------------------
    // VERIFICATION RETICLE
    // --------------------------------------------------

    console.log(
        "Reticle visible :",
        reticle.visible
    );


    // --------------------------------------------------
    // VERIFICATION OBJET
    // --------------------------------------------------

    console.log(
        "Objet chargé :",
        !!current_object
    );


    // Vérifier qu'on a un reticle
    // et un objet

    if (
        reticle.visible &&
        current_object
    ) {

        // Positionner l'objet
        // à l'endroit du reticle

        current_object.position
            .setFromMatrixPosition(
                reticle.matrix
            );


        // Afficher l'objet

        current_object.visible =
            true;


        console.log(
            "✅ Objet placé !"
        );


        console.log(
            "Position objet :",
            current_object.position
        );

    }

    else {

        console.log(
            "❌ Impossible de placer l'objet"
        );

        if (!reticle.visible) {

            console.log(
                "Le reticle n'est pas visible"
            );

        }

        if (!current_object) {

            console.log(
                "Aucun objet chargé"
            );

        }

    }
}


// ======================================================
// RENDER
// ======================================================

function render(
    timestamp,
    frame
) {

    // ==================================================
    // MODE AR
    // ==================================================

    if (
        frame &&
        renderer.xr.isPresenting
    ) {

        const session =
            renderer.xr.getSession();


        // --------------------------------------------------
        // CREATION DU HIT-TEST
        // --------------------------------------------------

        if (
            !hitTestSourceRequested
        ) {

            setupHitTestSource();

            hitTestSourceRequested =
                true;

        }


        // --------------------------------------------------
        // RECUPERATION DE LA REFERENCE SPACE
        // --------------------------------------------------

        if (
            hitTestSource
        ) {

            const referenceSpace =
                renderer.xr.getReferenceSpace();


            console.log(
                "Reference space XR :",
                referenceSpace
            );


            if (referenceSpace) {

                // --------------------------------------------------
                // RESULTATS DU HIT-TEST
                // --------------------------------------------------

                const hitTestResults =
                    frame.getHitTestResults(
                        hitTestSource
                    );


                // --------------------------------------------------
                // DEBUG IMPORTANT
                // --------------------------------------------------

                console.log(
                    "Nombre de surfaces détectées :",
                    hitTestResults.length
                );


                // --------------------------------------------------
                // UNE SURFACE A ETE DETECTEE
                // --------------------------------------------------

                if (
                    hitTestResults.length > 0
                ) {

                    const hit =
                        hitTestResults[0];


                    const pose =
                        hit.getPose(
                            referenceSpace
                        );


                    if (pose) {

                        console.log(
                            "🟢 SURFACE DÉTECTÉE"
                        );


                        // Afficher le cercle

                        reticle.visible =
                            true;


                        // Déplacer le cercle
                        // vers la surface détectée

                        reticle.matrix.fromArray(
                            pose.transform.matrix
                        );


                    }

                    else {

                        console.log(
                            "Pose impossible à récupérer"
                        );

                        reticle.visible =
                            false;

                    }

                }

                // --------------------------------------------------
                // AUCUNE SURFACE
                // --------------------------------------------------

                else {

                    reticle.visible =
                        false;

                }

            }

            else {

                console.log(
                    "❌ Reference space XR indisponible"
                );

            }

        }

        else {

            console.log(
                "⏳ Hit-test source pas encore disponible"
            );

        }

    }


    // ==================================================
    // RENDU
    // ==================================================

    renderer.render(
        scene,
        camera
    );
}


// ======================================================
// RESIZE
// ======================================================

function onWindowResize() {

    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();


    // IMPORTANT :
    // Ne pas utiliser setSize()
    // pendant une session XR

    if (
        !renderer.xr.isPresenting
    ) {

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
}


// ======================================================
// ERUDA
// ======================================================

console.log(
    "Bonjour depuis mon téléphone !"
);