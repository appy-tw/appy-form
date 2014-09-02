var appyApp = angular.module('appyApp', ['ngSanitize', 'mgo-angular-wizard']);

appyApp.config(function($sceDelegateProvider) {
  $sceDelegateProvider.resourceUrlWhitelist([
    'self',
    'http://www.uisltsc.com.tw/**',
    'https://backend.appy.tw/Appendectomy/**',
    'https://script.google.com/**',
    //'http://localhost/**'
    ]);
});

appyApp.controller('FormCtrl', function($scope, $http, $q, $window, $location, WizardHandler) {
  $scope.person = {};
  $scope.results = [];
  var mly = $http.get('data/mly-8.json');
  var constituency = $http.get('data/constituency.json');
  var districts = $http.get('data/districts.json');
  var district_info = $http.get('data/district-data.json');

  $scope.sourceList = [ '網路填寫', '網路下載', '夾報', '現場擺攤', '其他' ];

  $q.all([mly, constituency, districts, district_info]).then(function(results) {
    $scope.constituency = results[1].data;
    $scope.districts = results[2].data;
    $scope.district_info = results[3].data;
    $scope.initAddressFilter();
  });

  $scope.send = function() {
    $scope.sending = true;
    var url = 'https://script.google.com/macros/s/' +
      'AKfycbwi2ztrEetA6YRcnbSRbE1c6ntJN2Fb0BnaU83VD60LhF2ZAgM/exec';

    var params = angular.copy($scope.person);
    params.callback = 'JSON_CALLBACK';
    var config = { params: params };

    params.city = params.addrCity.name;
    delete params.addrCity;
    params.district = params.addrDistrict.name;
    delete params.addrDistrict;
    params.village = params.addrVillage.name;
    delete params.addrVillage;

    $http.jsonp(url, config).success(function() {
      $scope.sending = false;
      delete params.callback;
      $scope.results.push(params);
      var date = $scope.person.date;
      var sn = $scope.person.serialnumber;
      $scope.person = {};
      $scope.person.date = date;
      $scope.person.serialnumber = sn;
    });
  };

  $scope.initAddressFilter = function() {
    $scope.$watch('selectedCity', function(newValue, oldValue) {
      if (!newValue) {
        $scope.filteredDistricts = Object.keys($scope.constituency);
        return;
      }

      $scope.filteredDistricts = Object.keys($scope.constituency).filter(function(c) {
        return $scope.constituency[c].some(function(dist) {
          return (dist.indexOf(newValue.name) !== -1);
        });
      });
    });
  };

  $scope.onCityClick = function() {
    $scope.person.addrCity = $scope.districts[this.key];
  };

  $scope.onDistrictClick = function() {
    $scope.person.addrDistrict = $scope.person.addrCity.contains[this.key];
  };

  $scope.onVillageClick = function() {
    $scope.person.addrVillage = $scope.person.addrDistrict.contains[this.key];
  }
});

function getID(id) {
  var idArray=new Array();
  idArray[10]="A";  idArray[11]="B";  idArray[12]="C";  idArray[13]="D";
  idArray[14]="E";  idArray[15]="F";  idArray[16]="G";  idArray[17]="H";
  idArray[34]="I";  idArray[18]="J";  idArray[19]="K";  idArray[20]="L";
  idArray[21]="M";  idArray[22]="N";  idArray[35]="O";  idArray[23]="P";
  idArray[24]="Q";  idArray[25]="R";  idArray[26]="S";  idArray[27]="T";
  idArray[28]="U";  idArray[29]="V";  idArray[30]="X";  idArray[31]="Y";
  idArray[32]="W";  idArray[33]="Z";
  return idArray.indexOf(id.toUpperCase().substr(0,1))+id.substr(1,9);
}

function idCheck(id) {
  var newIdArray= getID(id);

  var baseNumber=
  parseInt(newIdArray.substr(0,1))*1+
  parseInt(newIdArray.substr(1,1))*9+
  parseInt(newIdArray.substr(2,1))*8+
  parseInt(newIdArray.substr(3,1))*7+
  parseInt(newIdArray.substr(4,1))*6+
  parseInt(newIdArray.substr(5,1))*5+
  parseInt(newIdArray.substr(6,1))*4+
  parseInt(newIdArray.substr(7,1))*3+
  parseInt(newIdArray.substr(8,1))*2+
  parseInt(newIdArray.substr(9,1))*1;
  if((baseNumber%10)==0)
    residue=0;
  else
    residue=10-(baseNumber%10);

  if(parseInt(newIdArray.substr(10,1))==residue)
    return true;
  else
    return false;
}

appyApp.directive('rocid', function($http) {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$parsers.unshift(function(viewValue) {
        if (idCheck(viewValue)) {
            // it is valid
            ctrl.$setValidity('rocid', true);
            return viewValue;
          } else {
            // it is invalid, return undefined (no model update)
            ctrl.$setValidity('rocid', false);
            return undefined;
          }
        });
    }
  };
});

function AddressCtrl($scope) {
  this.models = [];
}

AddressCtrl.prototype.registerModel = function(model) {
  this.models.push(model);
};

AddressCtrl.prototype.checkValidity = function(scope) {
	var ly = scope.selectedTarget;
  var constituency = ly.constituency.join(',');
  var cityList = scope.constituency[constituency];
  var size, cityname;
  var models = this.models;
  var ret = false;

  return cityList.some(function(city) {
    cityname = city.split(',');
    size = cityname.length;

    if (size === 1){
     if (models[0].$viewValue.name === cityname[0])
      return true;
  } else if (size === 2){
   if ((models[0].$viewValue.name === cityname[0])
    && (models[1].$viewValue.name === cityname[1])) {
    return true;
}
} else if (size >= 3){
 if ((models[0].$viewValue.name === cityname[0])
  && (models[1].$viewValue.name === cityname[1])
  && (models[2].$viewValue.name === cityname[2]))
  return true;
}
});
};

appyApp.directive("addrSet", function() {
  return {
   controller: 'AddressCtrl',
   link: function(scope, elem, attr, ctrl) {
   }
 }
});

appyApp.directive('addrArray', function() {
  return {
    require: ['^addrSet', 'ngModel'],
    link: function(scope, elem, attr, ctrl) {
     var addrCtrl = ctrl[0];
     var addrSelect = ctrl[1];
     addrCtrl.registerModel(addrSelect);
   }
 }
});

appyApp.directive('addrValidate', function() {
  return {
    require: ['^addrSet', 'ngModel'],
    scope:true,
    link: function(scope, elem, attr, ctrl) {
     var addrCtrl = ctrl[0];
     var addrSelect = ctrl[1];

     addrSelect.$parsers.push(function(viewValue) {
      addrSelect.$setValidity("addrValidate", addrCtrl.checkValidity(scope));
      return viewValue;
    });
   }
 }
});
