var myApp = angular.module('myApp', ['ngSanitize']);

myApp.controller("ChallengesCtrl", function($rootScope, $scope, $http, $timeout, $filter) {

  $scope.init = true;
  $scope.challenges = [];
  $scope.ids = [];
  $scope.new_ids = [];
  $scope.interval = 1000*3600;
  $scope.datasource = 'https://api.topcoder.com/v2/challenges/open?type=develop&sortColumn=challengeId&sortOrder=desc';

  $scope.marathonsrc = 'https://api.topcoder.com/v2/data/marathon/challenges?listType=Active&sortColumn=roundId&sortOrder=desc';

  // DEBUG
  DEBUG = false;
  if (DEBUG) {
    $scope.datasource = 'test/open.json';
    $scope.interval = 1000*5;
  }

  /*
   * Clean data read from API
   */
  var isOpen = function(challenge) {
    challenge.isnew = "";
    // Filter closed registration challenges
    if (challenge.registrationOpen != "Yes") {
      var pos = $.inArray(challenge.challengeId, $scope.ids);
      if (pos != -1) {
        $scope.ids.splice(pos, 1);
      }
      var pos = $.inArray(challenge.challengeId, $scope.new_ids);
      if (pos != -1) {
        $scope.new_ids.splice(pos, 1);
      }
      return false;
    }

    // Challenge already shown
    if ($.inArray(challenge.challengeId, $scope.ids) != -1) {
      return false;
    }
    // First time loading challenges, only challenges opened within the last
    // 24 hours are considered as new.
    var YESTERDAY = 24*3600*1000*1;
    var diff = timeDiff(challenge.registrationStartDate);
    if (diff > YESTERDAY) {
      $scope.ids.push(challenge.challengeId);
      return true;
    }

    // Challenge not read
    challenge.isnew = "not-read";
    // New challenge
    if ($.inArray(challenge.challengeId, $scope.new_ids) === -1) {
      $scope.new_ids.push(challenge.challengeId);
      return true;
    }
    // Challenge not read, already shown
    return false;
  };

  var cleanData = function(data) {
    return $filter('filter')(data, isOpen);
  };

  /*
   * Read data from API
   */
  var fetchData = function () {
    $http.get($scope.datasource)
      .success(function(data) {
        //$scope.aux_ids = $scope.ids;
        //$scope.aux_new_ids = $scope.new_ids;
        //$scope.ids = [];
        //$scope.new_ids = [];
        newChallenges = cleanData(data.data);
        angular.forEach(newChallenges, function(challenge) {
          $scope.challenges.push(challenge);
        });

        $scope.aux_ids = [];
        $scope.aux_new_ids = [];
        var d = $filter('date')(new Date(), 'EEE dd/MM HH:mm:ss');
        $scope.lastUpdate = "Last update: <strong>" + d + "</strong>";
        updateNumNewChallenges();

        if (DEBUG) {
          $scope.datasource = 'test/open2.json';
        }
    })
      .error(function(data, status, headers, config) {
        console.log("error get open");
    });
  };

  /*
   * Load new data
   */
  $scope.updateChallenges = function() {
    $timeout.cancel($scope.timer);
    fetchData();
    $scope.timer = $timeout($scope.updateChallenges, $scope.interval);
  };

  /*
   * Startup: Load challenges.
   */
  $scope.updateChallenges();

  /*
   * Time left for registration
   */
  $scope.timeUntil = function(diff) {
    // Get time components
    var days = diff/(24*3600) | 0;
    var hours = (diff - days*(24*3600))/(3600) | 0;
    var mins = diff % 3600 / 60 | 0;
    var secs = Math.round(diff % 6000 / 100);
    // Return formatted string
    var timeleft = "";
    if (days > 0) {
      if (days == 1) {
        timeleft += days + " day ";
      } else {
        timeleft += days + " days ";
      }
    }
    if (hours > 0) {
      if (hours == 1) {
        timeleft += hours + " h ";
      } else {
        timeleft += hours + " hs ";
      }
    }
    if (mins > 0 && !days) {
      timeleft += mins + " mins";
    }
    return timeleft;
  };

  /*
   * Mark all challenges as read
   */
  $scope.markAllRead = function() {
    angular.forEach($scope.challenges, function(challenge) {
      $scope.markRead(challenge);
    });
    if ($scope.new_ids.length != 0)
      console.log('markAllRead error len');
  }

  /*
   * Mark challenge as read
   */
  $scope.markRead = function(challenge) {
    // Add to old ids
    if ($.inArray(challenge.challengeId, $scope.ids) == -1) {
      $scope.ids.push(challenge.challengeId);
    }
    // Remove from new ids
    var pos = $.inArray(challenge.challengeId, $scope.new_ids);
    if (pos != -1) {
      $scope.new_ids.splice(pos, 1);
      updateNumNewChallenges();
    }
    challenge.isnew = "";
  };

  $scope.markReadId = function(id) {
    angular.forEach($scope.challenges, function(challenge) {
      if (challenge.challengeId == id) {
        $scope.markRead(challenge);
        return;
      }
    });
  }

  /*
   * Update number of new challenges
   */
  var updateNumNewChallenges = function() {
    $scope.len_new_challenges = $scope.new_ids.length;

    $rootScope.header = "";
    if ($scope.len_new_challenges > 0) {
        // Update title in header
        $rootScope.header = "(" + $scope.len_new_challenges + ") ";
        // Update new challenges counter
        $scope.numNewChallenges = "New challenges: <strong>" + $scope.len_new_challenges + "</strong>.";
      } else {
        $scope.numNewChallenges = "No new challenges.";
    }
    $rootScope.header += "[topcoder] challenges";
  };

  /*
   * Get difference between the start date and now.
   */
  var timeDiff = function(startDate) {
    var now = new Date().getTime();
    var d = Date.parse(startDate);
    return (now - d);
  };

  /*
   * Show challenge details.
   */
  $scope.showDetails = function(id) {
    // Check if id is valid
    if (($.inArray(id, $scope.new_ids) == -1) &&
        ($.inArray(id, $scope.ids) == -1)) {
      console.log("not valid");
      return;
    }

    var elemShow = angular.element(document.querySelector("#show-details-" + id));
    var elemDetails = angular.element(document.querySelector("#details-" + id));
    var elemReq = angular.element(document.querySelector("#req-" + id));

    if (elemShow.text() == "view details") {
      elemShow.text("hide details");
      elemDetails.removeClass('hide');
    } else {
      elemShow.text("view details");
      elemDetails.addClass('hide');
    }
    //elemReq.html("<h1>requirements</h1>"); return;

    var req = elemReq.html();
    if (req != "Retrieving...") {
      return;
    }
    $scope.markReadId(id);

    $http.get("https://api.topcoder.com/v2/challenges/" + id)
      .success(function(data) {
        elemReq.html(data.detailedRequirements);
    })
      .error(function(data, status, headers, config) {
        console.log("error get challenges");
    });
  };

});
