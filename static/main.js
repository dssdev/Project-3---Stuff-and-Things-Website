$( document ).ready(function() {
    getStuff();
});

//Keep a global variable of our stuff so we can use it in other places
var stuffList = [];
/*
This function will call the getStuff() server side function and retrieve all Stuff records in the DB.
The records are populated into a div in main.html and be styled as an accordion
It could stand to receive an id so we could expand the correct accordion during an update where the "stuff" is changed
*/
var getStuff = function(){
    stuffList = [];
    $.getJSON($SCRIPT_ROOT + '_get_stuff', function(data){

          $('#stuffDiv').empty();
          $("#stuffDiv").accordion({
               collapsible: true
            });

          if (data.Stuff.length != 0 ){
            $.each(data.Stuff, function(key,value){
                console.log("key: " + key + " value: " + value.name);
                stuffList.push({'id': value.id, 'name' :value.name});
                $('#stuffDiv').append('<h3>' + value.name + '(' + value.count + ')' + "</h3><div><ul id='thingsList" + key + "'></ul></div>");
                var things = []
                console.log("things: " + value.things);
                $.each(value.things, function (key, value) {
                    console.log("thing: " + value.name);
                    things.push("<li class='thingItem' data-thingID='" + value.id +"'><a href='#'>" + value.name + '</a></li>');
                });
                $('#thingsList' + key).html(things.join(''));
            });
          }else{
           $('#noStuffDiv').html("<b>You don't have any stuff! You can't have things without stuff! Only rhetoric spewing politicians can live off non sequiturs!</li>");
          }

            $('#stuffDiv').append("<h3>Add stuff!</h3><div> \
                                   <form action='/addstuff' id='newStuffForm'>Name of Your Stuff: <input type ='text' size='30' name='name'> \
                                   <input type='submit' id='addStuffBtn' value='Add'></form></div>");


            $('.thingItem').click(function(){
                console.log($(this).attr("data-thingID"));
                getThing($(this).attr("data-thingID"));
            });

            $('#newStuffForm').submit(function( event ) {

                  event.preventDefault();
                  // Get values
                  var $form = $( this ),
                    name = $form.find( "input[name='name']" ).val(),
                    url = $form.attr( "action" );

                  // Send the data using post
                  var posting = $.post( url, { 'name': name } );

                  // Refresh the div - This isn't particularly efficient to reload the entire thing. Maybe I'll change it later. Probably not.
                  posting.done(function( data ) {
                    getStuff();
                  });

                  posting.fail(function(data){
                    alert(data.responseText);
                  });
             });


            $("#stuffDiv").accordion( "refresh" );
    });
};

var getThing = function(id){
    $.getJSON( "/getthing", { 'id': id}, function(data){
        console.log(data.Thing[0].description);
        $('#thingsDiv').html("<h2>" + data.Thing[0].name + "<i>(qty: " + data.Thing[0].quantity +")</i>" + "</h2></br><p>" + data.Thing[0].description + "</p>"
                            + "<img id='thingImage' src=''/><br/>"
                             + "<a href='\addthings' id='addLink'>Add </a><a href='#' id='editLink'>Edit </a><a href='#' id='deleteLink'>Delete </a>"
        );

        $('#thingImage').attr('src',data.Thing[0].image);

        var newSize = resizeImage(300,600,$('#thingImage').height(),$('#thingImage').width());
        $('#thingImage').height(newSize.height);
        $('#thingImage').width(newSize.width);

        $('#addLink').click(function(event){
            event.preventDefault();
            addDialog();
        });


        $('#deleteLink').click(function(){
            deleteDialog(id);
        });

        $('#editLink').click(function(){
            editDialog(data.Thing[0]);
        });
    });
};

var addDialog = function(){
    $('#dialog-add').show();
    $('#dialog-add').dialog({
        resizeable: false,
        height:400,
        width:800,
        modal: true,
        title: "Add New Thing"
    });
};


var deleteDialog = function(id){
    console.log("del id: " + id);
    $('#dialog-delete').html("You're about to send this thing to the bit bucket in the sky. Are you sure?");
    $('#dialog-delete').dialog({
          open: function(event, ui) { $(".ui-dialog-titlebar-close").hide(); },
          resizable: false,
          height:200,
          width:250,
          modal: true,
          title: "Delete Thing?",
          buttons: {
            "Delete": function() {
              $( this ).dialog( "close" );
              deleteThing(id);
            },
            "Cancel": function() {
              $( this ).dialog( "close" );
            }
          }
    });
};

var deleteThing = function(id){
    console.log("going to delete: " + id);
    $.post('/deletething', {'id': id}, function(data){
        getStuff();
        $('#thingsDiv').html("<p>The thing is gone now :( </p>");
    });

};

var editDialog = function(thing){
    $('#updateForm').trigger("reset");
    $('#dialog-update').show();
    $('#updateForm').find('#name').attr('value', thing.name);
    $('#updateForm').find('#description').attr('value', thing.description);
    $('#updateForm').find('#quantity').attr('value', thing.quantity);
    $('#stuffSelector').html('');
    $.each(stuffList, function(key, value){
        if (thing.stuff_id != value.id){
            $('#stuffSelector').append("<option value='" + value.id + "'>" + value.name + "</option>");
        }else{
            $('#stuffSelector').append("<option value='" + value.id + "' selected='selected'>" + value.name + "</option>");
        }

    });

    $('#dialog-update').dialog({
      open: function(event, ui) { $(".ui-dialog-titlebar-close").hide(); },
      title: "Edit Thing",
      height: 400,
      width: 600,
      modal: true,
      buttons: {
        "Update": function(){
          $(this).dialog("close");
          updateThing(thing);
        },
        "Cancel": function() {
          $(this).dialog( "close" );
        }
      }
    });
};

var updateThing = function(thing){
    /*This is kludy but I don't feel like redesigning it now.
      We need to unbind because we're adding a new listener each time we update.
      Need to get the thing.id from somewhere other than the args to get this out and
      clean it up.
    */
    $('#updateForm').unbind("submit");
    $('#updateForm').submit(function( event ) {

          event.preventDefault();
          // Get values
          var $form = $( this ),
            name = $form.find( "input[name='name']" ).val(),
            description = $form.find( "input[name='description']" ).val(),
            quantity = $form.find( "input[name='quantity']" ).val(),
            stuff_id = $('#stuffSelector').val(),
            url = $form.attr( "action" );

          // Send the data using post
          var posting = $.post( url, { 'id': thing.id, 'name': name, 'description': description, 'quantity': quantity, 'stuff_id': stuff_id } );

          // Refresh the div - This isn't particularly efficient to reload the entire thing. Maybe I'll change it later. Probably not.
          posting.done(function( data ) {
            getThing(thing.id);
            getStuff();
          });
     }).submit();


};

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

function convertToBase64(){
              var file    = document.querySelector('input[type=file]').files[0];
              var hidden = document.querySelector('input[type=hidden]');
              var reader  = new FileReader();
              reader.addEventListener("load",function(event){
                    document.getElementById("addThing").disabled = false;
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
                document.getElementById("addThing").disabled = true;
              }
}