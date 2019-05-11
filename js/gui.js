"use strict";

var Gui = Gui || {
  controlParamsStruct: {},
  meshList: [],
  meshID: 0, // we increment this id every time we push mesh
};

Gui.init = function() {
  this.meshListDatGui = new dat.GUI();
  this.controlListDatGui = new dat.GUI();

  for (var controlIdx = 0; controlIdx < GuiConfig.controlDefs.length; controlIdx++) {
    var controlDef = GuiConfig.controlDefs[controlIdx];
    this.controlParamsStruct[controlDef.name] = controlDef.defaultVal;
    // }
    this.controlListDatGui.open();
  }
//   this.parseUrl();

  for (var controlIdx = 0; controlIdx < GuiConfig.controlDefs.length; controlIdx++) {
    var controlDef = GuiConfig.controlDefs[controlIdx];
    var paramControl = undefined;

    switch (controlDef.type) {
      case "slider":
        paramControl = this.controlListDatGui.add(
          this.controlParamsStruct,
          controlDef.name,
          controlDef.sliderRange[0],
          controlDef.sliderRange[1]
        );
        paramControl.step(
          controlDef.step ||
            (controlDef.isFloat && 1) ||
            (controlDef.sliderRange[1] - controlDef.sliderRange[0]) / 20
        );
        break;
      case "dropdown":
        paramControl = this.controlListDatGui.add(
          this.controlParamsStruct,
          controlDef.name,
          controlDef.dropdownOptions
        );
        break;
      case "color":
        paramControl = this.controlListDatGui.addColor(this.controlParamsStruct, controlDef.name);
        break;
      case "string":
        paramControl = this.controlListDatGui.add(this.controlParamsStruct, controlDef.name);
        break;
      case "button":
        paramControl = this.controlListDatGui.add(this.controlParamsStruct, controlDef.name);
        break;
      default:
    }
    paramControl.onChange(Gui.handleControlsChange);
  }

  this.meshListDatGui.open();

  if (this.meshList.length == 0) {
    this.pushMesh();
  }

  this.handleControlsChange();

  this.fullyInitialized = true;
};

Gui.pushMesh = function(newMesh) {
  if (newMesh == undefined) {
    var newMesh = {
      name: "Mesh " + (Gui.meshID++).toString(),
      meshName: GuiConfig.meshFileNames[0],
      useMaterial: false,
      tx: 0,
      tz: 0
    };
  }

  newMesh.meshInstance = new MeshInstance(newMesh.meshName, newMesh.useMaterial, new THREE.Vector3(newMesh.tx, 0, newMesh.tz));

  newMesh.delete = function() {
    Renderer.removeMeshInstance(this.meshInstance);
    for (var meshIdx = 0; meshIdx < Gui.meshList.length; meshIdx++) {
      if (Gui.meshList[meshIdx].name == this.name) {
        Gui.meshList.splice(meshIdx, 1);
      }
    }
    Gui.meshListDatGui.removeFolder(this.name);
    // Gui.updateUrl();
  };

  newMesh.updateMesh = function() {
    Renderer.removeMeshInstance(this.meshInstance);
    this.meshInstance = new MeshInstance(this.meshName, newMesh.useMaterial, new THREE.Vector3(newMesh.tx, 0, newMesh.tz));
    Renderer.addMeshInstance(this.meshInstance);
    // Gui.updateUrl();
  };

  var meshFolder = Gui.meshListDatGui.addFolder(newMesh.name);
  Gui.meshList.push(newMesh);
  var handler = undefined;
  handler = meshFolder.add(newMesh, "meshName", GuiConfig.meshFileNames).name("Mesh File");
  handler.onChange(
    (function(newMesh) {
      return function() {
        newMesh.updateMesh();
      };
    })(newMesh)
  );

  handler = meshFolder.add(newMesh, "useMaterial").name("Use Material");
  handler.onChange(
    (function(newMesh) {
      return function() {
        newMesh.updateMesh();
      };
    })(newMesh)
  );

  handler = meshFolder.add(newMesh, "tx", -10, 10).name("Translate X");
  handler.onChange(
    (function(newMesh) {
      return function() {
        newMesh.updateMesh();
      };
    })(newMesh)
  );

  handler = meshFolder.add(newMesh, "tz", -5, 10).name("Translate Z");
  handler.onChange(
    (function(newMesh) {
      return function() {
        newMesh.updateMesh();
      };
    })(newMesh)
  );

  Renderer.addMeshInstance(newMesh.meshInstance);

  meshFolder.add(newMesh, "delete").name("Delete");
  meshFolder.open();
//   Gui.updateUrl();
};

Gui.handleControlsChange = function() {
  if (Gui.suspendDisplayUpdate) return;

  for (var controlIdx = 0; controlIdx < GuiConfig.controlDefs.length; controlIdx++) {
    var controlDef = GuiConfig.controlDefs[controlIdx];
    var val = Gui.controlParamsStruct[controlDef.name];
    var converted_val = undefined;

    if (controlDef.type == "color") {
      converted_val = [];
      if (typeof val === "string") {
        var bigint = parseInt(val.substring(1), 16);
        converted_val[0] = (bigint >> 16) & 255;
        converted_val[1] = (bigint >> 8) & 255;
        converted_val[2] = bigint & 255;
      } else {
        converted_val = val;
      }
      converted_val = new Pixel(
        converted_val[0] / 255,
        converted_val[1] / 255,
        converted_val[2] / 255
      );
    } else {
      converted_val = val;
    }

    switch (controlDef.name) {
      case "Shading Model":
        Renderer.shaderMode = converted_val;
        break;
      case "Ambient":
        Reflection.ambient = converted_val;
        break;
      case "Diffuse":
        Reflection.diffuse = converted_val;
        break;
      case "Specular":
        Reflection.specular = converted_val;
        break;
      case "Shininess":
        Reflection.shininess = converted_val;
        break;
      default:
    }
  }
//   Gui.updateUrl();
};

Gui.getFilterHistoryData = function() {
  return this.historyFilters;
};

// gets rid of the ".0000000001" etc when stringifying floats
// from http://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript
function stripFloatError(number) {
  if (number && number.toPrecision) {
    return parseFloat(number.toPrecision(5));
  } else {
    return number;
  }
}


Gui.alertOnce = function(msg, divName) {
  divName = divName || "alert_div";
  // NOTE: mainDiv opacity change disabled to allow >1 different alerts
  // var mainDiv = document.getElementById('main_div');
  // mainDiv.style.opacity = "0.3";
  var alertDiv = document.getElementById(divName);
  alertDiv.innerHTML = "<p>" + msg + '</p><button id="ok" onclick="Gui.closeAlert()">ok</button>';
  alertDiv.style.display = "inline";
};

Gui.closeAlert = function(divName) {
  divName = divName || "alert_div";
  // NOTE: mainDiv opacity change disabled to allow >1 different alerts
  // var mainDiv = document.getElementById('main_div');
  // mainDiv.style.opacity = "1";
  var alertDiv = document.getElementById(divName);
  alertDiv.style.display = "none";
};
