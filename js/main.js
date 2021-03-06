var appyApp = angular.module('appyApp', ['ngSanitize', 'mgo-angular-wizard', 'angucomplete']);

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
  $scope.serialnumberMapping = {
    num: {
      '01': ['新北市', '板橋區'],
      '02': ['新北市', '板橋區'],
      '03': ['臺北市', '內湖區'],
      '04': ['臺北市', '南港區'],
      '05': ['新北市', '石門區'],
      '06': ['新北市', '三芝區'],
      '07': ['新北市', '淡水區'],
      '08': ['新北市', '八里區'],
      '09': ['新北市', '林口區'],
      '10': ['新北市', '泰山區']
    },
    name: {
      '新北市板橋區': ['01', '02'],
      '臺北市內湖區': ['03'],
      '臺北市南港區': ['04'],
      '新北市石門區': ['05'],
      '新北市三芝區': ['06'],
      '新北市淡水區': ['07'],
      '新北市八里區': ['08'],
      '新北市林口區': ['09'],
      '新北市泰山區': ['10']
    }
  };
  var mly = $http.get('data/mly-8.json');
  var constituency = $http.get('data/constituency.json');
  var districts = $http.get('data/districts.json');
  var district_info = $http.get('data/district-data.json');

  function selectArea(city, district) {
    $scope.person.addrCity = $scope.districts[city];
    $scope.person.addrDistrict = $scope.person.addrCity.contains[district];
    delete $scope.person.addrVillage;
  }

  $q.all([mly, constituency, districts, district_info]).then(function(results) {
    $scope.constituency = results[1].data;
    $scope.district_info = results[3].data;
    $scope.initAddressFilter();
    $scope.villages = [];

    $scope.$watch('selectedAddr', function(newValue) {
      if (newValue) {
        var item = newValue.originalObject;
        $scope.person.addrCity = $scope.districts[item.city];
        $scope.person.addrDistrict = $scope.person.addrCity.contains[item.district];
        $scope.person.addrVillage = $scope.person.addrDistrict.contains[item.village];
      }
    });

    $scope.$watch('person.serialnumber', function(newValue, oldValue) {
      if (newValue && newValue.length === 6) {
        var num = newValue.substr(0, 2);

        if ($scope.serialnumberMapping.num[num]) {
          selectArea.apply(null, $scope.serialnumberMapping.num[num]);
        }
      }
    });

    $scope.districts = {};
    var ids = ['TPQ,6', 'TPE,4', 'TPQ,1'];

    var places = {};
    angular.forEach(ids, function(id) {
      var constituency = $scope.constituency[id];
      angular.forEach(constituency, function(area) {
        var cur = places;
        var prev;
        var parts = area.split(',');
        angular.forEach(parts, function(placename, index) {
          if (!cur[placename]) {
            cur[placename] = (index >= parts.length - 1) ? true : {};
          }
          cur = cur[placename];
        });
      });
    });

    angular.forEach(results[2].data, function(cityContent, cityName) {
      if (places[cityName] === true) {
        $scope.districts[cityName] = cityContent;
      } else {
        angular.forEach(cityContent.contains, function(districtContent, districtName) {
          if (places[cityName] && places[cityName][districtName] === true) {
            if (!$scope.districts[cityName]) {
              $scope.districts[cityName] = { contains: {} };
            }
            $scope.districts[cityName].contains[districtName] = districtContent;
          } else {
            angular.forEach(districtContent.contains, function(villageContent, villageName) {
              if (places[cityName] && places[cityName][districtName] && places[cityName][districtName][villageName] === true) {
                if (!$scope.districts[cityName]) {
                  $scope.districts[cityName] = { contains: {} };
                }
                if (!$scope.districts[cityName].contains[districtName]) {
                  $scope.districts[cityName].contains[districtName] = { contains: {}};
                }
                $scope.districts[cityName].contains[districtName].contains[villageName] = villageContent;
              }
            });
          }
        });
      }
    });

    angular.forEach($scope.districts, function(districts, cityName) {
      angular.forEach(districts.contains, function(villages, districtName) {
        angular.forEach(villages.contains, function(v) {
          var item = {
            city: cityName,
            district: districtName,
            village: v.name
          }
          $scope.villages.push(item);
        });
      });
    });
  });

  $scope.getLabel = function(type) {
    var label = 'label-default';
    if (!$scope.districts) {
      return label;
    }

    if ($scope.person['addr' + type] && $scope.person['addr' + type].name === this.key) {
      return 'label-primary';
    }

    return label;
  };

  $scope.send = function() {
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
    params.hasQrcode = params.hasQrcode.toUpperCase();
    params.hasFStamp = params.hasFStamp.toUpperCase();
    params.done = false;

    $scope.results.push(params);
    delete $scope.person.birthday;
    delete $scope.person.id;
    delete $scope.person.phone;

    $http.jsonp(url, config).success(function() {
      params.done = true;
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
  if (!id) {
    return false;
  }
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
