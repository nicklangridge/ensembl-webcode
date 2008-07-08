function moveto( el, lt, tp, wd, ht ) {
  if( wd < 0 ) { lt+=wd;wd=-wd;}
  if( ht < 0 ) { tp+=ht;ht=-ht;}
  el.setStyle({ left: lt+'px', top: tp+'px'});
  if(wd||ht) resize( el, wd, ht );
}

function resize(el,wd,ht) {
  el.setStyle({ width: wd+'px', height: ht+'px'});
}

var dragging_object = null;
var dragging_image  = null;
var drag_offset_x   = 0;
var drag_offset_y   = 0;
var N               = 3;
var events          = {};
var lines           = ['l','r','b','t'];

var fudge_x         = Prototype.Browser.IE ? 2 : 1;
var fudge_y         = Prototype.Browser.IE ? 3 : 1;

function drag_start( evt ) {
  __info( 'drag start... ');
  dragging_object = Event.findElement(evt,'table');
  __info( dragging_object );
  var x = dragging_object.cumulativeOffset();
  drag_offset_x = Event.pointerX(evt) - x[0];
  drag_offset_y = Event.pointerY(evt) - x[1];
  Event.observe(ensembl_body,'mousemove', drag_move);
  Event.observe(ensembl_body,'mouseup'  , drag_stop);
  Event.observe(ensembl_body,'mousedown', drag_move);
}

function drag_stop( evt ) {
  Event.stopObserving(ensembl_body,'mousemove', drag_move);
  Event.stopObserving(ensembl_body,'mouseup'  , drag_stop);
  Event.stopObserving(ensembl_body,'mousedown', drag_move);
}

function drag_move( evt ) {
  moveto( dragging_object, Event.pointerX(evt) - drag_offset_x, Event.pointerY(evt) - drag_offset_y );
}

/*
  When we select the start we need to know if we are in one of
  the "selectable" regions...  These have a href of
  #draggable:identifier:seq_region_name:start-end:strand
*/

function select_start( evt ) {
  if( evt.button == 2 ) { return; }
  dragging_object = Event.findElement( evt, 'div' );
  dragging_image  = Event.findElement( evt, 'img' );
  if( !dragging_image ) {
    dragging_map = Event.findElement( evt, 'map' );
    dragging_image = $( dragging_map.id.substring(0, dragging_map.id.length - 4 ) );
  }
  var x           = dragging_object.cumulativeOffset();
  drag_offset_x   = x[0];
  drag_offset_y   = x[1];
  SELECTION_X     = Event.pointerX(evt) - x[0] - fudge_x;
  SELECTION_Y     = Event.pointerY(evt) - x[1] - fudge_y;
  var s = 'height:1px;width:1px;left:'+SELECTION_X+'px;top:'+SELECTION_Y+'px';
  lines.each(function(n){
    var nm = 'other_'+n;
    if($(nm)){$(nm).remove();}
    dragging_object.appendChild( Builder.node('div',{ id: nm,style:s,className:'rubberband' },[
      Builder.node('img',{src:'/i/blank.gif'})
    ]));
  });
  Event.observe(ensembl_body,'mousemove',select_move, true);
  Event.observe(ensembl_body,'mouseup',  select_stop, true);
  Event.observe(ensembl_body,'click',    select_click,true);
  Event.stop(evt);
}

function seq_region() { return 'x'; }

function select_move( evt ) {
  var enx = Event.pointerX(evt) - drag_offset_x - fudge_x;
  var eny = Event.pointerY(evt) - drag_offset_y - fudge_y;
  var bps = 99; // p2b( dragging_id, enx );
  dragging_image.title = seq_region()+': '+bps;
  var el = $( 'other_l' );
  if( el && el.getHeight() + el.getWidth() > 0 ) { /* this is our current rubber band */
    br_x = dragging_image.getWidth()  -1;
    br_y = dragging_image.getHeight() -1;
    if(enx<0) enx = 0;
    if(eny<0) eny = 0;
    if(enx>br_x) enx = br_x;
    if(eny>br_y) eny = br_y;
    W = enx-SELECTION_X;
    H = eny-SELECTION_Y;
    moveto(el,           SELECTION_X,           SELECTION_Y+(H>0?0:1), 1,            H+(H>0?1:-1) );
    moveto($('other_t'), SELECTION_X+(W>0?0:1), SELECTION_Y,           W+(W>0?1:-1), 1            );
    moveto($('other_r'), enx,                   SELECTION_Y+(H>0?0:1), 1,            H+(H>0?1:-1) );
    moveto($('other_b'), SELECTION_X+(W>0?0:1), eny,                   W+(W>0?1:-1), 1            );
  }
  Event.stop(evt);
}

function select_click( evt ) {
  __info( 'click event fired............' );
  Event.stop(evt);
}

var stored_hrefs   = {};

function select_stop( evt ) {
  Event.stopObserving(ensembl_body,'mousemove', select_move,true);
  Event.stopObserving(ensembl_body,'mouseup'  , select_stop,true);
  Event.stopObserving(ensembl_body,'click',     select_click,true);
  var el = $('other_l');
  var et = $('other_t');
  __status( 'select stop...' );
  if( el && et && el.getHeight() + et.getWidth() > 0 ) {
    var t = el.cumulativeOffset();
    var start_x = t[0];
        t = et.cumulativeOffset();
    var start_y = t[1];
    var end_x   = Event.pointerX(evt);
    var end_y   = Event.pointerY(evt);
        t = dragging_image.cumulativeOffset();
    var tl_x = t[0];
    var tl_y = t[1];
    var br_x = tl_x + dragging_image.getWidth() - 1;
    var br_y = tl_y + dragging_image.getHeight()  - 1;
    if( end_x < tl_x ) { end_x = tl_x; }
    if( end_y < tl_y ) { end_y = tl_y; }
    if( end_x > br_x ) { end_x = br_x; }
    if( end_y > br_y ) { end_y = br_y; }
    W = end_x-start_x - fudge_x;
    H = end_y-start_y - fudge_y;
    __info( W+'...'+H );
    if( W*W+H*H > N*N-1) { // This is a region select....
      lines.each(function(n){
        if( $('real_'+n) ) { $('real_'+n).remove(); }
        $( 'other_'+n ).setAttribute('id', 'real_'+n);
      });
      _show_zmenu_range( { x: end_x, y: end_y } );
    } else {
      var image_map = $(dragging_image.id+'_map');
      if( image_map && !(evt.altKey) ) {
        __info( 'image_map...' );
        var flag = 1;
        var X = end_x-tl_x - fudge_x;
        var Y = end_y-tl_y - fudge_y;
        __info( end_x+' ......... '+end_y+' === '+X+','+Y );
	var drag_href  = '';
	var drag_start = 0;
	var drag_end   = 0;
        $A(image_map.areas).each(function(Ax){
          var KEY = dragging_image.id+':'+Ax.shape+':'+Ax.coords;
          if(Ax.href) {
	    T = Ax.href.split(/#/);
            stored_hrefs[KEY] = T.length>1 ? '#'+T[1] : Ax.href;
            Ax.removeAttribute('href');
          }
          var link = stored_hrefs[KEY];
          if( link ) {
            pts = Ax.coords.split(/\D+/);
            if( Ax.shape=='poly'   ? in_poly(   pts, X, Y ) : (
                Ax.shape=='circle' ? in_circle( pts, X, Y ) :
                                    in_rect(   pts, X, Y ) ) ) {
              __status( link );
	      if( link.substring(0,6)=='#drag|') {
	        drag_href  = link;
		drag_start = 1*pts[0];
		drag_end   = 1*pts[2];
	      } else {
                _show_zmenu( { x: end_x, y: end_y, key: KEY, h: link, title: Ax.title } );
                flag = 0;
              }
	    }
          }
        });
	if( flag==1 && drag_href ){
	  A = drag_href.split(/\|/);
	  __info( X+'+'+drag_start+' '+drag_end+' '+A[5]+' '+A[6] );

          _show_zmenu_location( {
	    x: end_x, y: end_y,
            bp: 1*A[5] + (1*A[6]-1*A[5]+1)/(drag_end-drag_start) * (X - drag_start)
	  } );
	}
      }
    }
  }
  Event.stop(evt);
  return false;
}

function in_circle( pts, pt_x, pt_y ) {
  return (pt_x-pts[0])*(pt_x-pts[0]) + (pt_y-pts[1])*(pt_y-pts[1]) <= pts[2]*pts[2];
}

function in_rect( pts, pt_x, pt_y ) {
  return pt_x >= pts[0] && pt_y >= pts[1] && pt_x <= pts[2] && pt_y<= pts[3];
}

function in_poly( pts, pt_x, pt_y ) {
  var L = pts.length;
  var T = 0;
  for(var i=0;i<L;i+=2) {
    x1 = pts[     i % L ] - pt_x;
    y1 = pts[ (i+1) % L ] - pt_y;
    x2 = pts[ (i+2) % L ] - pt_x;
    y2 = pts[ (i+3) % L ] - pt_y;
    T += Math.atan2( x1*y2-y1*x2, x1*x2+y1*y2);
  }
  return Math.abs(T/Math.PI/2) > 0.01;
}

var drag_areas = {};
function sortN(a,b){ return a-b; }
function sortNr(a,b){ return b-a; }
function __drag_select_init() {
//  $$('.drag_select').each(function(n){ n.onmousedown = select_start; });
  __info( 'here................' );
  $$('.drag_select').each(function(n){ Event.observe(n,'mousedown', select_start); });
  $$('.drag_select').each(function(n){
    n.getElementsBySelector('img').each(function(i_n){
      var m = $(i_n.id+'_map');
      if(m) {
        m.descendants().each(function(ma){
          if(ma.href) {
            var T = ma.href.split(/#/);
            if( T[1] && T[1].substring(0,5)=='drag|') {
              var a = T[1].split(/\|/);
              if( ! drag_areas[a[1]] )       drag_areas[a[1]] = {};
              if( ! drag_areas[a[1]][a[2]] ) drag_areas[a[1]][a[2]] = [];
              var b = ma.coords.split(/[, ]+/);
              var flag = 1;
              drag_areas[a[1]][a[2]].each(function(x){ // check for duplicates...
                if( x['img'] == i_n.id &&
                  x['pixel_start'] == b[0] &&
                  x['pixel_top']   == b[1] &&
                  x['pixel_end']   == b[2] &&
                  x['pixel_bottom']== b[3] &&
                  x['species']     == a[3] &&
                  x['seq_region']  == a[4] &&
                  x['bp_start']    == a[5] &&
                  x['bp_end']      == a[6] &&
                  x['strand']      == a[7]
                ) flag = 0;
              });
              if( flag) {
                drag_areas[a[1]][a[2]].push( {
                           img: i_n.id,
                  pixel_bottom: b[3],
                    pixel_top: b[1],
                  pixel_start: b[0],
                    pixel_end: b[2],
                      species: a[3],
                   seq_region: a[4],
                     bp_start: a[5],
                       bp_end: a[6],
                       strand: a[7]
                } );
              }
            }
          }
        });
      }
    });
  });
/** now lets draw the red boxes... **/
  $H(drag_areas).each(function(slice_pair){
// Remove any current red-boxes so we can start again...
    $$('.redbox').each(function(n){n.remove();});
    var T = $H(slice_pair.value);
    var panel_ids = T.keys();
    panel_ids.sort(sortNr);
    var first_panel = panel_ids.shift();
    if(panel_ids.length > 0 ) {
      panel_ids.each(function(panel){
/* Now we draw the red lines on the two displays....
  first_panel from pixel_start -> pixel_end (pixel_bottom -> pixel_top)
  panel       from "p_start"   -> "p_end"   (pixel_bottom -> pixel_top)

  p_start = first_panel.bp_start - panel.bp_start)

*/
        slice_pair.value[first_panel].each(function(area_b){
          slice_pair.value[panel].each(function(area_t){
            var img_b = $(area_b['img']);
            var img_t = $(area_t['img']);
            var div_b = img_b.up('div');
            var div_t = img_t.up('div');
            var off_t = img_t.cumulativeOffset().top - div_t.cumulativeOffset().top;
            var off_b = img_b.cumulativeOffset().top - div_b.cumulativeOffset().top;

            __draw_red_box( div_b,
              area_b['pixel_start'], area_b['pixel_end'],
              1 * off_b + 1*area_b['pixel_top'],1 * off_b+1*area_b['pixel_bottom']
            );
            var bp_w_t = area_t['bp_end']-area_t['bp_start']+1;
            var sf     = bp_w_t ? (area_t['pixel_end']-area_t['pixel_start'])/bp_w_t : 1;
            var pixel_start = (area_b['bp_start']-area_t['bp_start']) * sf + 1*area_t['pixel_start'];
            var pixel_end   = (area_b['bp_end']  -area_t['bp_start']) * sf + 1*area_t['pixel_start'];
            __draw_red_box( div_t,
              pixel_start,pixel_end,
              1 * off_t+1*area_t['pixel_top']+2,1 * off_t+1*area_t['pixel_bottom']-2
            );
          });
        });
        first_panel = panel;
      });
    }
  });
}

function __draw_red_box( d, l, r, t, b ) {
  var w = r-l+1;
  var h = b-t+1;
  var s1 = 'left:'+l+'px;width:1px;top:'+t+'px;height:'+h+'px';
  var s2 = 'left:'+r+'px;width:1px;top:'+t+'px;height:'+h+'px';
  var s3 = 'left:'+l+'px;width:'+w+'px;top:'+t+'px;height:1px';
  var s4 = 'left:'+l+'px;width:'+w+'px;top:'+b+'px;height:1px';
  d.appendChild(Builder.node('div',{className:'redbox',style:s1},[Builder.node('img',{'src':'/i/blank.gif'})]));
  d.appendChild(Builder.node('div',{className:'redbox',style:s2},[Builder.node('img',{'src':'/i/blank.gif'})]));
  d.appendChild(Builder.node('div',{className:'redbox',style:s3},[Builder.node('img',{'src':'/i/blank.gif'})]));
  d.appendChild(Builder.node('div',{className:'redbox',style:s4},[Builder.node('img',{'src':'/i/blank.gif'})]));
}

addLoadEvent(__drag_select_init);

var __seq_region_name;
var __seq_region_start;
var __seq_region_end;
var __seq_region_width;

function __get_location_info() {
  var T = $('tab_location').firstDescendant().innerHTML;
  __info( 'T '+T );
  T = T.replace(/,/g,'');
  __info( 'T '+T );
  var M = T.match(/^Location: (.+):(\d+)-(\d+)$/);
  __info( M );
  if( M ) {
    __seq_region_name  = M[1];
    __seq_region_start = 1*M[2];
    __seq_region_end   = 1*M[3];
    __seq_region_width = __seq_region_end-__seq_region_start+1;
    __info( 'START:'+__seq_region_start );
  }
}

addLoadEvent(__get_location_info);

