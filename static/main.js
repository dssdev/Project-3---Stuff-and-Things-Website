//Keep a global variable of our stuff so we can use it in other places
var stuffList = [];

/*
Main functions to perform on load are populating
the stuff accordian with stuff.
*/
$( document ).ready(function() {
    getStuff();
    $('#mainThingAddLink').click(function(){
        addDialog(stuffList);
    });

    $('.thingItem').click(function(){
                console.log($(this).attr("data-thingID"));
                getThing($(this).attr("data-thingID"));
    });
});



/*
This function will call the getStuff() server side function and retrieve all Stuff records in the DB.
The records are populated into a div in main.html and be styled as an accordion
It could stand to receive an id so we could expand the correct accordion during an update where the "stuff" is changed
*/
var getStuff = function(){
    $.getJSON($SCRIPT_ROOT + '_get_stuff', function(data){
        /*empty the list so we don't have duplicates - this ends up being used to populate form
        selectors as well */
        stuffList = [];
          $('#stuffDiv').empty();

          //define the accordian
          $("#stuffDiv").accordion({
               collapsible: true
            });

          /*
            Assuming we have some stuff entered, populate the accordion with the stuff as headers
            and the things that belong to it as items
            */
          if (data.Stuff.length != 0 ){
            $('#noStuffDiv').html('');
            $.each(data.Stuff, function(key,value){
                console.log("key: " + key + " value: " + value.name);
                stuffList.push({'id': value.id, 'name' :value.name});
                //build the stuff headers and placeholder for things
                $('#stuffDiv').append('<h3>' + value.name + '(' + value.count + ')' + "</h3><div><ul id='thingsList" + key + "'></ul></div>");
                var things = [];
                console.log("things: " + value.things);
                //add the things under the stuff if there are any
                $.each(value.things, function (key, value) {
                    console.log("thing: " + value.name);
                    things.push("<li class='thingItem' data-thingID='" + value.id +"'><a href='#'>" + value.name + '</a></li>');
                });
                //Add a link for things if it's empty
                if (things.length == 0){
                    things.push("<li><a href='#' id='noThingsLink'>Add Things!</a></li>");
                    $('#thingsList' + key).html(things.join(''));

                    $('#noThingsLink').click(function(event){
                        console.log('open add dialog');
                        addDialog(stuffList);
                    });
                }else{
                    $('#thingsList' + key).html(things.join(''));
                }


            });
            //Case for no stuff
          }else{
           $('#noStuffDiv').html("<b>You don't have any stuff! You can't have things without stuff!" +
                                "Only rhetoric spewing politicians can live off non sequiturs!</li>");
          }

            //Always have a bottom element for adding more stuff
            $('#stuffDiv').append("<h3>Add stuff!</h3><div> \
                                   <form action='/addstuff' id='newStuffForm'>Name of Your Stuff: <input type ='text' size='30' name='name'> \
                                   <input type='submit' id='addStuffBtn' value='Add'></form></div>");

            /*The data-thingID attribute in each thing item holds
            the unique ID for the thing. We need to get that
            and pass it along so we can load the thing details from
            the DB.
            */
            $('.thingItem').click(function(){
                console.log($(this).attr("data-thingID"));
                getThing($(this).attr("data-thingID"));
            });

            /*
            Decided way after the fact that I really would have rather used Angular
            for two way data binding so I'm pseduo implementing that and hijacking
            the new stuff submit so the entire page doesn't refresh
            */
            $('#newStuffForm').submit(function( event ) {

                  event.preventDefault();
                  // Get values
                  var $form = $( this ),
                    name = $form.find( "input[name='name']" ).val(),
                    url = $form.attr( "action" );

                  var posting = $.post( url, { 'name': name } );

                  // Refresh the div - This isn't particularly efficient to reload the entire thing. Maybe I'll change it later. Probably not.
                  posting.done(function( data ) {
                    getStuff();
                  });

                  posting.fail(function(data){
                    unauthorizedDialog(data.responseText);
                  });
             });


            $("#stuffDiv").accordion( "refresh" );
    });
};

/*
Gets the thing based on the id passed.
*/
var getThing = function(id){
    $.getJSON( "/getthing", { 'id': id}, function(data){
        console.log(data.Thing[0].description);
        //Header for name/category and links for Adding, Editing and Deleting
        $('#thingsDiv').html("<h2>" + data.Thing[0].name + "<i>(qty: " + data.Thing[0].quantity +")</i>" + "</h2>"
                            + "<div class='thing-link'><a href='#' id='addLink'>Add New | </a><a href='#' id='editLink'>Edit | </a>"
                            + "<a href='#' id='deleteLink'>Delete </a></div>"
                            + "<p>" + data.Thing[0].description + "</p>"
                            + "<img id='thingImage' src=''/><br/>"

        );

        $('#thingImage').attr('src',data.Thing[0].image);

        //Image sizing was behaving oddly, so I'm forcing an image resize
        var newSize = resizeImage(300,600,$('#thingImage').height(),$('#thingImage').width());
        $('#thingImage').height(newSize.height);
        $('#thingImage').width(newSize.width);
        $('#thingImage').css('margin', '10');

        //Listener for adding a new thing
        $('#addLink').click(function(event){
            event.preventDefault();
            addDialog(stuffList);
        });

        //Listener for deleting a thing
        $('#deleteLink').click(function(){
            deleteDialog(id);
        });

        //Listener for editing the thing
        $('#editLink').click(function(){
            editDialog(data.Thing[0], stuffList);
        });
    });
};


/*
Deletes the thing based on the ID passed.
*/
var deleteThing = function(id, stoken){
    console.log("going to delete: " + id);
    var posting = $.post('/deletething', {'id': id, 'token': stoken}, function(data){
        getStuff();
        $('#thingsDiv').html("<p>The thing is gone now :( </p>");
    });

    posting.fail(function(data){
        unauthorizedDialog(data.responseText);
    });

};

/*
Grabs the form date and performs an update.
*/
var updateThing = function(thing){

    $('#thingForm').submit(function( event ) {

          event.preventDefault();
          // Get values
          var $form = $( this ),
            name = $form.find( "input[name='name']" ).val(),
            description = $form.find( "input[name='description']" ).val(),
            quantity = $form.find( "input[name='quantity']" ).val(),
            base64img = $form.find( "input[name='base64img']" ).val(),
            stuff_id = $('#stuffSelector').val();

          // Send the data using post
          var posting = $.post( '/updatething', { 'id': thing.id, 'name': name, 'description': description, 'quantity': quantity,'base64img': base64img, 'stuff_id': stuff_id } );

          // Refresh the div - This isn't particularly efficient to reload the entire thing. Maybe I'll change it later. Probably not.
          posting.done(function( data ) {
            getThing(thing.id);
            getStuff();
          });

          posting.fail(function(data){
            unauthorizedDialog(data.responseText);
          });

          posting.always(function(){
            /*This is kludy but I don't feel like redesigning it now.
             We need to unbind because we're adding a new listener each time we update.
             Need to get the thing.id from somewhere other than the args to get this out and
             clean it up.
            */
            $('#thingForm').unbind("submit");
          });
     }).submit();


};
/*
Get new dimensions for an image.
*/
function resizeImage(maxHeight, maxWidth, originalHeight, originalWidth){

    var aspectRatio = 0;
    var newHeight = originalHeight;
    var newWidth = originalWidth;

    if (originalHeight > originalWidth){
        aspectRatio = originalWidth / originalHeight;
        if (originalHeight > maxHeight){
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
        }
    }else{
        aspectRatio = originalHeight / originalWidth;
        if (originalWidth > maxWidth){
            newWidth = maxWidth;
            newHeight = newWidth * aspectRatio;
        }
    }

    return {'width': newWidth, 'height': newHeight};

}
/*
Function to take the selected image, convert to base64 and display a preview.
It should take elements for parameters so it isn't coupled. Could refactor later.
*/
function convertToBase64(){
              var file    = document.querySelector('input[type=file]').files[0];
              var hidden = document.querySelector('input[type=hidden]');
              var reader  = new FileReader();
              reader.addEventListener("load",function(event){
                    hidden.value = reader.result;
                    $('#addImagePreview').attr('src','');
                    $('#addImagePreview').removeAttr('style');
                    $('#addImagePreview').attr('src',reader.result);
                    var newSize = resizeImage(65,65,$('#addImagePreview').height(),$('#addImagePreview').width());
                    $('#addImagePreview').height(newSize.height);
                    $('#addImagePreview').width(newSize.width);
                    $('#addImagePreview').addClass('img-preview');
                    console.log(reader.result);
              });

              if (file) {
              reader.readAsDataURL(file);
                //Really should but some code to disable the add button in, but I'm not.
              }
}

/*
JQuery function to remove the default values from forms.
Due to reusing the same form for add/update, it caused some issues with lingering data.
So, this should be called to clear it out.
*/

$.fn.clearForm = function() {
  return this.each(function() {
    var type = this.type, tag = this.tagName.toLowerCase();
    if (tag == 'form')
      return $(':input',this).clearForm();
    if (type == 'text' || type == 'password' || type == 'number'|| type == 'hidden' || tag == 'textarea')
      this.value = '';
    else if (type == 'checkbox' || type == 'radio')
      this.checked = false;
    else if (tag == 'select')
      this.selectedIndex = 1;
  });
};