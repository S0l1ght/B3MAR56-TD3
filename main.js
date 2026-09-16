import * as THREE from "three";

import { ARButton }
    from "three/addons/webxr/ARButton.js";

import { OrbitControls }
    from "three/addons/controls/OrbitControls.js";

import { GLTFLoader }
    from "three/addons/loaders/GLTFLoader.js";

import { RGBELoader }
    from "three/addons/loaders/RGBELoader.js";


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

// HIT TEST
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

    renderer.outputColorSpace =
        THREE.SRGBColorSpace;

    document
        .getElementById("container")
        .appendChild(renderer.domElement);


    // --------------------------------------------------
    // PMREM
    // --------------------------------------------------

    pmremGenerator =
        new THREE.PMREMGenerator(renderer);

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
            0xffffff,
            2
        );

    directionalLight.position.set(
        0,
        5,
        5
    );

    scene.add(
        directionalLight
    );


    const ambientLight =
        new THREE.AmbientLight(
            0xffffff,
            1
        );

    scene.add(
        ambientLight
    );


    // --------------------------------------------------
    // RETICLE / CERCLE DE PLACEMENT
    // --------------------------------------------------

    const geometry =
        new THREE.RingGeometry(
            0.12,
            0.18,
            32
        );

    geometry.rotateX(
        -Math.PI / 2
    );


    const material =
        new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });


    reticle =
        new THREE.Mesh(
            geometry,
            material
        );

    // La position et la rotation
    // viennent du hit-test
    reticle.matrixAutoUpdate = false;

    reticle.visible = false;

    scene.add(
        reticle
    );


    // ==================================================
    // CONFIGURATION AR
    // ==================================================

    const arOptions = {

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


    const arButton =
        ARButton.createButton(
            renderer,
            arOptions
        );

    document.body.appendChild(
        arButton
    );


    // ==================================================
    // SESSION AR START
    // ==================================================

    renderer.xr.addEventListener(
        "sessionstart",
        onSessionStart
    );


    // ==================================================
    // SESSION AR END
    // ==================================================

    renderer.xr.addEventListener(
        "sessionend",
        onSessionEnd
    );


    // ==================================================
    // RESIZE
    // ==================================================

    window.addEventListener(
        "resize",
        onWindowResize
    );


    // ==================================================
    // BOUCLE DE RENDU
    // ==================================================

    renderer.setAnimationLoop(
        render
    );


    // ==================================================
    // MODELE PAR DEFAUT
    // ==================================================

    loadModel(
        current_url
    );
}


// ======================================================
// SESSION AR START
// ======================================================

function onSessionStart() {

    console.log(
        "=============================="
    );

    console.log(
        "SESSION AR DEMARREE"
    );

    console.log(
        "=============================="
    );


    // Reset hit test

    hitTestSource = null;

    hitTestSourceRequested = false;


    // Cacher le cercle

    reticle.visible = false;


    // Cacher le modèle

    if (current_object) {

        current_object.visible = false;

    }


    // Récupérer la session

    const session =
        renderer.xr.getSession();


    if (!session) {

        console.error(
            "Impossible de récupérer la session XR"
        );

        return;
    }


    // SELECT = toucher l'écran

    session.addEventListener(
        "select",
        onSelect
    );


    console.log(
        "Event SELECT installé"
    );
}


// ======================================================
// SESSION AR END
// ======================================================

function onSessionEnd() {

    console.log(
        "Session AR terminée"
    );


    hitTestSource = null;

    hitTestSourceRequested = false;


    reticle.visible = false;


    // Remettre le modèle visible
    // hors AR

    if (current_object) {

        current_object.visible = true;

    }
}


// ======================================================
// MENU DES MODELES
// ======================================================

$(".ar-object").click(
    function () {

        current_url =
            $(this).attr("id");


        // Ne pas changer de modèle
        // pendant la session AR

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
// CHARGEMENT MODELE GLB
// ======================================================

function loadModel(model) {

    console.log(
        "Chargement de : "
        + model
        + ".glb"
    );


    // --------------------------------------------------
    // CHARGEMENT HDR
    // --------------------------------------------------

    new RGBELoader()

        .setDataType(
            THREE.HalfFloatType
        )

        .setPath("")

        .load(

            "lakeside_sunrise_2k.hdr",

            function (texture) {

                console.log(
                    "HDR chargé"
                );


                // --------------------------------------------------
                // ENVIRONMENT MAP
                // --------------------------------------------------

                envmap =
                    pmremGenerator
                        .fromEquirectangular(
                            texture
                        )
                        .texture;


                scene.environment =
                    envmap;


                texture.dispose();


                // --------------------------------------------------
                // CHARGEMENT GLB
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


                        // --------------------------------------------------
                        // SUPPRIMER ANCIEN OBJET
                        // --------------------------------------------------

                        if (current_object) {

                            scene.remove(
                                current_object
                            );

                        }


                        // --------------------------------------------------
                        // NOUVEL OBJET
                        // --------------------------------------------------

                        current_object =
                            glb.scene;


                        scene.add(
                            current_object
                        );


                        // --------------------------------------------------
                        // POSITION NAVIGATEUR
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


                        const center =
                            new THREE.Vector3();

                        box.getCenter(
                            center
                        );


                        controls.target.copy(
                            center
                        );


                        controls.update();


                        // --------------------------------------------------
                        // VISIBLE
                        // --------------------------------------------------

                        current_object.visible =
                            true;


                        render();


                        console.log(
                            "Modèle prêt"
                        );

                    },


                    // --------------------------------------------------
                    // PROGRESSION
                    // --------------------------------------------------

                    function (xhr) {

                        if (xhr.total > 0) {

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
                            "Erreur GLB :",
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
                    "Erreur HDR :",
                    error
                );

            }

        );
}


// ======================================================
// CREATION HIT TEST
// ======================================================

function setupHitTestSource() {

    const session =
        renderer.xr.getSession();


    if (!session) {

        console.error(
            "Pas de session XR"
        );

        return;
    }


    console.log(
        "Création du Hit Test..."
    );


    // --------------------------------------------------
    // VIEWER SPACE
    // --------------------------------------------------

    session
        .requestReferenceSpace(
            "viewer"
        )

        .then(
            function (viewerSpace) {

                console.log(
                    "Viewer space obtenu"
                );


                return session
                    .requestHitTestSource({

                        space:
                            viewerSpace

                    });

            }
        )

        .then(
            function (source) {

                hitTestSource =
                    source;


                console.log(
                    "✅ HIT TEST ACTIVÉ"
                );

            }
        )

        .catch(
            function (error) {

                console.error(
                    "❌ ERREUR HIT TEST :",
                    error
                );

            }
        );


    // --------------------------------------------------
    // FIN SESSION
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
// SELECT / TOUCH ECRAN
// ======================================================

function onSelect() {

    console.log(
        "👆 SELECT / TOUCH"
    );


    // Pas de surface

    if (!reticle.visible) {

        console.log(
            "Pas de surface détectée"
        );

        return;
    }


    // Pas de modèle

    if (!current_object) {

        console.log(
            "Aucun modèle chargé"
        );

        return;
    }


    // --------------------------------------------------
    // RECUPERER POSITION DU RETICLE
    // --------------------------------------------------

    const position =
        new THREE.Vector3();


    position.setFromMatrixPosition(
        reticle.matrix
    );


    // --------------------------------------------------
    // PLACER LE MODELE
    // --------------------------------------------------

    current_object.position.copy(
        position
    );


    // Afficher

    current_object.visible =
        true;


    console.log(
        "✅ OBJET PLACÉ"
    );

    console.log(
        "Position :",
        position
    );
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
        // CREER HIT TEST UNE SEULE FOIS
        // --------------------------------------------------

        if (
            !hitTestSourceRequested
        ) {

            setupHitTestSource();

            hitTestSourceRequested =
                true;

        }


        // --------------------------------------------------
        // HIT TEST
        // --------------------------------------------------

        if (hitTestSource) {

            const referenceSpace =
                renderer.xr.getReferenceSpace();


            if (referenceSpace) {

                const hitTestResults =
                    frame.getHitTestResults(
                        hitTestSource
                    );


                // --------------------------------------------------
                // SURFACE DETECTEE
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

                        // Afficher le cercle

                        reticle.visible =
                            true;


                        // Position + rotation

                        reticle.matrix.fromArray(
                            pose.transform.matrix
                        );


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


    // Ne pas modifier la taille
    // pendant XR

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
// DEBUG
// ======================================================

console.log(
    "Three.js AR initialisé"
);