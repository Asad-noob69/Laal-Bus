// icon imports
import busIcon from "./busfavicon.png";
import markerShadow from "./marker-shadow.png";
import busIcon2x from "./busfavicon.png"; 

import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: busIcon,         
  iconRetinaUrl: busIcon2x, 
  shadowUrl: markerShadow,  
});

export default L;
