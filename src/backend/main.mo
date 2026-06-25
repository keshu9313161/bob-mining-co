import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Nat "mo:core/Nat";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

// Add braces for actor body and place actor in with clause

actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Type definitions
  type Score = {
    name : Text;
    bob : Nat;
    depth : Nat;
  };

  public type UserProfile = {
    name : Text;
  };

  // Persistent state
  let scores = Map.empty<Principal, Score>();
  var gamesPlayed : Nat = 0;
  let saveState = Map.empty<Principal, Text>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Helper function to compare scores
  func compareScores(a : Score, b : Score) : Order.Order {
    Nat.compare(b.bob, a.bob);
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Leaderboard Functions
  public shared ({ caller }) func submitScore(name : Text, bob : Nat, depth : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit scores");
    };
    scores.add(
      caller,
      {
        name;
        bob;
        depth;
      },
    );
    gamesPlayed += 1;
  };

  public query func getLeaderboard() : async [Score] {
    // Public function - no authorization needed
    let scoresArray = scores.values().toArray();
    let sorted = scoresArray.sort(compareScores);
    let limit = Nat.min(50, sorted.size());
    Array.tabulate<Score>(limit, func(i) { sorted[i] });
  };

  public query func getTotalGamesPlayed() : async Nat {
    // Public function - no authorization needed
    gamesPlayed;
  };

  public query ({ caller }) func getPlayerScore() : async ?Score {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their scores");
    };
    scores.get(caller);
  };

  // Save Sync Functions
  public shared ({ caller }) func saveProgress(progress : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save progress");
    };
    saveState.add(caller, progress);
  };

  public query ({ caller }) func loadProgress() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can load progress");
    };
    saveState.get(caller);
  };
};

