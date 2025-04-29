import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useLocation } from "react-router-dom";
import Footer from "./Footer";
import HotelCard from "./HotelCard";
import HotelFilter from "./HotelFilter";
import axios from "axios";

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

function HotelSearch() {
  const locationState = useLocation();
  const { destination, checkInDate, checkOutDate, adults, children, rooms } =
    locationState.state || {};

  const [showGuestsDropdown, setShowGuestsDropdown] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [filters, setFilters] = useState({
    price: [],
    rating: [],
    amenities: [],
    bedroomType: [],
  });

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await axios.get("http://localhost:5003/arrival");
        setDestinations(response.data.locations || []);
      } catch (err) {
        console.error("Error fetching destinations:", err);
        setError("Failed to load destinations. Please try again.");
      }
    };

    fetchDestinations();
  }, []);

  const [searchData, setSearchData] = useState({
    destination: destination || "",
    checkInDate: checkInDate || "",
    checkOutDate: checkOutDate || "",
    adults: adults || 1,
    children: children || 0,
    rooms: rooms || 1,
  });

  const guestsDropdownRef = useRef(null);

  const fetchHotels = useCallback(
    debounce(async (dest, filters) => {
      if (!dest) return;

      const queryParams = new URLSearchParams();
      queryParams.append("arrival", dest);

      if (filters.price?.length > 0 && !filters.price.includes("all")) {
        filters.price.forEach((price) => {
          switch (price) {
            case "below2000":
              queryParams.append("totalpricepernight", "0-2000");
              break;
            case "2000to5000":
              queryParams.append("totalpricepernight", "2000-5000");
              break;
            case "5000to10000":
              queryParams.append("totalpricepernight", "5000-10000");
              break;
            case "above10000":
              queryParams.append("totalpricepernight", "10000+");
              break;
            default:
              break;
          }
        });
      }

      if (filters.rating?.length > 0 && !filters.rating.includes("all")) {
        filters.rating.forEach((rating) => {
          queryParams.append("rating", rating === "below3" ? "0-2.9" : rating);
        });
      }

      if (filters.amenities?.length > 0) {
        filters.amenities.forEach((amenity) =>
          queryParams.append("amenities", amenity)
        );
      }

      if (filters.bedroomType?.length > 0) {
        filters.bedroomType.forEach((type) =>
          queryParams.append("bedroomtype", type)
        );
      }

      const fetchKey = `${dest}|${queryParams.toString()}`;
      if (fetchKey === lastFetched) {
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:5003/all?${queryParams.toString()}`
        );
        setHotels(response.data.all || []);
        setLastFetched(fetchKey);
      } catch (error) {
        console.error("Error fetching hotels:", error);
        setHotels([]);
      } finally {
        setLoading(false);
      }
    }, 500),
    [lastFetched]
  );

  useEffect(() => {
    if (searchData.destination) {
      fetchHotels(searchData.destination, filters);
    }
  }, [searchData.destination, filters, fetchHotels]);

  const handleGuestChange = (type, increment) => {
    setSearchData((prev) => {
      if (type === "adults") {
        const newAdults = Math.max(1, Math.min(prev.adults + increment, 10));
        const newRooms = Math.min(prev.rooms, Math.ceil(newAdults / 2));
        return { ...prev, adults: newAdults, rooms: newRooms };
      }
      if (type === "children") {
        const newChildren = Math.max(0, Math.min(prev.children + increment, 10));
        return { ...prev, children: newChildren };
      }
      if (type === "rooms") {
        const newRooms = Math.max(1, Math.min(prev.rooms + increment, 5));
        const newAdults = Math.max(newRooms, prev.adults);
        return { ...prev, rooms: newRooms, adults: newAdults };
      }
      return prev;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        guestsDropdownRef.current &&
        !guestsDropdownRef.current.contains(event.target)
      ) {
        setShowGuestsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const debouncedSetSearchData = useCallback(
    debounce((name, value) => {
      setSearchData((prev) => ({ ...prev, [name]: value }));
    }, 500),
    []
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    debouncedSetSearchData(name, value);
  };

  const handleSearch = () => {
    if (!searchData.destination) {
      alert("Please enter a destination.");
      return;
    }
    fetchHotels(searchData.destination, filters);
  };

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleGuestsDropdownClick = (e) => {
    e.stopPropagation();
    setShowGuestsDropdown(!showGuestsDropdown);
  };

  if (error) {
    return <div className="text-center py-8 text-sm sm:text-base">{error}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-50 flex justify-center w-full bg-[#06152B] px-2 sm:px-4">
        <div className="w-full max-w-7xl py-3 sm:py-4">
          <div className="w-full bg-white rounded-md flex flex-col overflow-hidden shadow-lg">
            <div className="flex flex-col sm:flex-row">
              <div className="flex-1 flex flex-col items-start justify-center px-3 sm:px-4 py-2 border-b sm:border-b-0 sm:border-r border-gray-300">
                <span className="text-xs text-gray-600">Where do you want to stay?</span>
                <select
                  name="destination"
                  value={searchData.destination}
                  onChange={(e) => handleInputChange(e)}
                  className="text-blue-600 font-semibold text-sm sm:text-base bg-transparent outline-none w-full"
                >
                  <option value="">Select Destination</option>
                  {destinations.map((dest, index) => (
                    <option key={index} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 flex flex-col items-start justify-center px-3 sm:px-4 py-2 border-b sm:border-b-0 sm:border-r border-gray-300">
                <span className="text-xs text-gray-600">Check-in</span>
                <input
                  type="date"
                  name="checkInDate"
                  value={searchData.checkInDate}
                  onChange={handleInputChange}
                  className="w-full text-blue-600 font-semibold text-sm sm:text-base bg-transparent outline-none"
                />
              </div>
              <div className="flex-1 flex flex-col items-start justify-center px-3 sm:px-4 py-2 border-b sm:border-b-0 sm:border-r border-gray-300">
                <span className="text-xs text-gray-600">Check-out</span>
                <input
                  type="date"
                  name="checkOutDate"
                  value={searchData.checkOutDate}
                  onChange={handleInputChange}
                  className="w-full text-blue-600 font-semibold text-sm sm:text-base bg-transparent outline-none"
                />
              </div>
              <div
                ref={guestsDropdownRef}
                className="flex-1 flex flex-col items-start justify-center px-3 sm:px-4 py-2 border-b sm:border-b-0 sm:border-r border-gray-300 relative"
                onClick={handleGuestsDropdownClick}
              >
                <span className="text-xs text-gray-600">Guests and rooms</span>
                <span className="text-blue-600 font-semibold text-sm sm:text-base truncate">
                  {searchData.adults} adults
                  {searchData.children > 0 ? `, ${searchData.children} children` : ""}
                  , {searchData.rooms} room
                </span>
                <ChevronDown
                  className={`absolute right-3 sm:right-4 top-6 sm:top-7 w-4 h-4 text-black transition-transform ${
                    showGuestsDropdown ? "rotate-180" : ""
                  }`}
                />
                {showGuestsDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-xl z-[100] p-3 sm:p-4 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <div>
                        <span className="block text-sm font-medium">Adults</span>
                        <span className="text-xs text-gray-500">Ages 18+</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                          onClick={() => handleGuestChange("adults", -1)}
                          className="bg-gray-200 w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-full disabled:opacity-50 touch-manipulation"
                          disabled={searchData.adults <= 1}
                        >
                          -
                        </button>
                        <span className="w-6 sm:w-8 text-center text-sm">
                          {searchData.adults}
                        </span>
                        <button
                          onClick={() => handleGuestChange("adults", 1)}
                          className="bg-gray-200 w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-full disabled:opacity-50 touch-manipulation"
                          disabled={searchData.adults >= 10}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <div>
                        <span className="block text-sm font-medium">Children</span>
                        <span className="text-xs text-gray-500">Ages 0-17</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                          onClick={() => handleGuestChange("children", -1)}
                          className="bg-gray-200 w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-full disabled:opacity-50 touch-manipulation"
                          disabled={searchData.children <= 0}
                        >
                          -
                        </button>
                        <span className="w-6 sm:w-8 text-center text-sm">
                          {searchData.children}
                        </span>
                        <button
                          onClick={() => handleGuestChange("children", 1)}
                          className="bg-gray-200 w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-full disabled:opacity-50 touch-manipulation"
                          disabled={searchData.children >= 10}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="block text-sm font-medium">Rooms</span>
                        <span className="text-xs text-gray-500">Max 5 rooms</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                          onClick={() => handleGuestChange("rooms", -1)}
                          className="bg-gray-200 w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-full disabled:opacity-50 touch-manipulation"
                          disabled={searchData.rooms <= 1}
                        >
                          -
                        </button>
                        <span className="w-6 sm:w-8 text-center text-sm">
                          {searchData.rooms}
                        </span>
                        <button
                          onClick={() => handleGuestChange("rooms", 1)}
                          className="bg-gray-200 w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-full disabled:opacity-50 touch-manipulation"
                          disabled={searchData.rooms >= 5}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowGuestsDropdown(false)}
                      className="mt-3 sm:mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors text-sm touch-manipulation"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleSearch}
                className="bg-blue-600 text-white flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-b-md sm:rounded-b-none sm:rounded-r-md font-semibold text-sm sm:text-base touch-manipulation"
              >
                Search hotels <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-gray-100">
        <div className="w-full max-w-7xl mx-auto flex flex-col mt-4 sm:mt-8 px-2 sm:px-4 gap-4 flex-1">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center lg:hidden px-2">
              <h3 className="text-lg sm:text-xl font-semibold">
                Hotels in {searchData.destination || "Any Location"}
              </h3>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm touch-manipulation"
              >
                {showFilter ? "Hide Filters" : "Show Filters"}
              </button>
            </div>
            <div className="flex flex-col lg:flex-row gap-4">
              <div
                className={`w-full lg:w-1/4 ${showFilter ? "block" : "hidden lg:block"}`}
              >
                <HotelFilter onFilterChange={handleFilterChange} />
              </div>
              <div className="w-full lg:w-3/4 flex flex-col gap-4">
                <h3 className="text-lg sm:text-xl font-semibold hidden lg:block">
                  Available Hotels in {searchData.destination || "Any Location"}
                </h3>
                <div className="flex-1 h-[calc(100vh-200px)] sm:h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin">
                  <div className="space-y-4 pb-10">
                    {loading ? (
                      <div className="text-center text-gray-500 py-8 text-sm sm:text-base">
                        Loading hotels...
                      </div>
                    ) : hotels.length === 0 ? (
                      <div className="text-center text-gray-500 py-8 text-sm sm:text-base">
                        No hotels found for this location.
                      </div>
                    ) : (
                      hotels.map((hotel, index) => (
                        <HotelCard
                          key={hotel.hotel + hotel.arrival}
                          hotel={hotel}
                          checkInDate={searchData.checkInDate}
                          checkOutDate={searchData.checkOutDate}
                          adults={searchData.adults}
                          children={searchData.children}
                          rooms={searchData.rooms}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 bg-gray-100">
        <Footer />
      </div>
    </div>
  );
}

export default HotelSearch;