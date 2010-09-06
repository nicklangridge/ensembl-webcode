package EnsEMBL::Web::Data::Record::History;

use strict;

use base qw(EnsEMBL::Web::Data::Record);

__PACKAGE__->set_type('history');

__PACKAGE__->add_fields(
  name   => 'text',
  object => 'text', # Location, Gene etc
  param  => 'text',
  value  => 'text',
  uri    => 'text',
);

1;